import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const projectId='djps09z6';
const dataset='production';
const apiVersion='2026-09-08';
const queryUrl=`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`;
const mutateUrl=`https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;

type Pickup={name:string;label:string;city:string;area?:string;address?:string;lat:number;lng:number};

async function sanityQuery<T>(query:string){
  const response=await fetch(`${queryUrl}?query=${encodeURIComponent(query)}`,{cache:'no-store'});
  if(!response.ok)throw new Error(`Sanity query failed (${response.status})`);
  return ((await response.json()) as {result:T}).result;
}

async function mutate(mutations:unknown[],token:string){
  const response=await fetch(mutateUrl,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mutations})});
  if(!response.ok)throw new Error(`Sanity mutation failed (${response.status}): ${(await response.text()).slice(0,180)}`);
}

export async function GET(){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Inte inloggad.'},{status:401});
    const admin=createAdminClient();
    const {data:profile,error}=await admin.from('profiles').select('display_name,city,sanity_profile_id').eq('id',user.id).maybeSingle();
    if(error)throw error;
    let locations:Pickup[]=[];
    if(profile?.sanity_profile_id){
      locations=await sanityQuery<Pickup[]>(`*[_type=="pickupLocation" && owner._ref==${JSON.stringify(profile.sanity_profile_id)}]|order(_createdAt asc){name,"label":coalesce(address,name),city,area,address,"lat":location.lat,"lng":location.lng}`);
    }
    return NextResponse.json({displayName:profile?.display_name||'',locations});
  }catch(error){
    console.error('Host profile load failed',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Kunde inte läsa uthyrarprofilen.'},{status:500});
  }
}

export async function POST(request:Request){
  const token=process.env.SANITY_API_WRITE_TOKEN;
  if(!token)return NextResponse.json({error:'Sanity är inte konfigurerat.'},{status:503});
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Inte inloggad.'},{status:401});
    const admin=createAdminClient();
    const body=await request.json() as {displayName?:string;locations?:Pickup[]};
    const displayName=String(body.displayName||'').trim();
    const locations=(body.locations||[]).filter(item=>item&&item.name&&item.city&&Number.isFinite(item.lat)&&Number.isFinite(item.lng));
    if(!displayName)return NextResponse.json({error:'Ange ditt namn.'},{status:400});
    if(!locations.length)return NextResponse.json({error:'Lägg till minst en utlämningsplats.'},{status:400});

    const {data:existingProfile,error:profileError}=await admin.from('profiles').select('sanity_profile_id').eq('id',user.id).maybeSingle();
    if(profileError)throw profileError;
    const sanityProfileId=existingProfile?.sanity_profile_id||`user-${user.id}`;
    const existingPickupIds=await sanityQuery<Array<{_id:string}>>(`*[_type=="pickupLocation" && owner._ref==${JSON.stringify(sanityProfileId)}]{_id}`);
    const mutations:unknown[]=[
      {createIfNotExists:{_id:sanityProfileId,_type:'userProfile',displayName,city:locations[0].city}},
      {patch:{id:sanityProfileId,set:{displayName,city:locations[0].city}}},
      ...existingPickupIds.map(item=>({delete:{id:item._id}})),
      ...locations.map((loc,index)=>({create:{
        _id:`pickup-${user.id}-${index}-${Date.now().toString(36)}`,
        _type:'pickupLocation',
        name:loc.name.trim(),
        owner:{_type:'reference',_ref:sanityProfileId},
        city:loc.city.trim(),
        area:(loc.area||'').trim()||undefined,
        address:(loc.address||loc.label||'').trim()||undefined,
        location:{_type:'geopoint',lat:loc.lat,lng:loc.lng},
      }})),
    ];
    await mutate(mutations,token);
    const {error:updateError}=await admin.from('profiles').update({display_name:displayName,city:locations[0].city,sanity_profile_id:sanityProfileId,updated_at:new Date().toISOString()}).eq('id',user.id);
    if(updateError)throw updateError;
    return NextResponse.json({ok:true,sanityProfileId});
  }catch(error){
    console.error('Host profile save failed',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Kunde inte spara uthyrarprofilen.'},{status:500});
  }
}
