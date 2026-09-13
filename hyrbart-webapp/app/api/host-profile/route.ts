import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Pickup={name:string;label:string;city:string;area?:string;address?:string;lat:number;lng:number};

export async function GET(){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Inte inloggad.'},{status:401});

    const admin=createAdminClient();
    const [{data:profile,error:profileError},{data:pickupRows,error:pickupError}]=await Promise.all([
      admin.from('profiles').select('display_name,city,sanity_profile_id').eq('id',user.id).maybeSingle(),
      admin.from('host_pickup_locations').select('name,label,city,area,address,lat,lng').eq('user_id',user.id).order('sort_order',{ascending:true}),
    ]);
    if(profileError)throw profileError;
    if(pickupError)throw pickupError;

    const locations:Pickup[]=(pickupRows||[]).map(row=>({
      name:row.name,
      label:row.label,
      city:row.city,
      area:row.area||undefined,
      address:row.address||undefined,
      lat:Number(row.lat),
      lng:Number(row.lng),
    }));

    return NextResponse.json({displayName:profile?.display_name||'',locations});
  }catch(error){
    console.error('Host profile load failed',error);
    return NextResponse.json({error:'Kunde inte läsa uthyrarprofilen just nu.'},{status:500});
  }
}

export async function POST(request:Request){
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

    const city=locations[0].city.trim();
    const sanityProfileId=`user-${user.id}`;

    const {error:profileError}=await admin.from('profiles').upsert({
      id:user.id,
      display_name:displayName,
      city,
      sanity_profile_id:sanityProfileId,
      updated_at:new Date().toISOString(),
    },{onConflict:'id'});
    if(profileError)throw profileError;

    const {error:deleteError}=await admin.from('host_pickup_locations').delete().eq('user_id',user.id);
    if(deleteError)throw deleteError;

    const rows=locations.map((loc,index)=>({
      user_id:user.id,
      name:loc.name.trim(),
      label:(loc.label||loc.address||loc.name).trim(),
      city:loc.city.trim(),
      area:(loc.area||'').trim()||null,
      address:(loc.address||loc.label||'').trim()||null,
      lat:loc.lat,
      lng:loc.lng,
      sort_order:index,
      updated_at:new Date().toISOString(),
    }));
    const {error:insertError}=await admin.from('host_pickup_locations').insert(rows);
    if(insertError)throw insertError;

    return NextResponse.json({ok:true,sanityProfileId});
  }catch(error){
    console.error('Host profile save failed',error);
    return NextResponse.json({error:'Det gick inte att spara profilen just nu. Försök igen.'},{status:500});
  }
}
