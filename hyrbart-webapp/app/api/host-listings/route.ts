import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const projectId='djps09z6';
const dataset='production';
const apiVersion='2026-09-08';
const queryUrl=`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`;
const mutateUrl=`https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;

type Listing={id:string;slug:string;brand?:string;name?:string;typeSv?:string;category?:string;dailyPrice?:number;listingStatus?:'active'|'paused'|'draft';image?:string;description?:{sv?:string};createdAt?:string};

async function context(){
  const supabase=await createClient(); const admin=createAdminClient();
  const {data:{user}}=await supabase.auth.getUser(); if(!user)return {error:NextResponse.json({error:'Inte inloggad.'},{status:401})};
  const {data:profile,error}=await admin.from('profiles').select('sanity_profile_id,payout_method_ready').eq('id',user.id).maybeSingle();
  if(error)throw error; if(!profile?.sanity_profile_id)return {error:NextResponse.json({error:'Uthyrarprofil saknas.'},{status:409})};
  return {user,profile,admin};
}
async function query<T>(q:string,token:string){const r=await fetch(`${queryUrl}?query=${encodeURIComponent(q)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});if(!r.ok)throw new Error(`Sanity query ${r.status}`);return ((await r.json()) as {result:T}).result}
async function mutate(mutations:unknown[],token:string){const r=await fetch(mutateUrl,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mutations})});if(!r.ok)throw new Error(`Sanity mutation ${r.status}: ${(await r.text()).slice(0,180)}`);return r.json()}

export async function GET(){
  const token=process.env.SANITY_API_WRITE_TOKEN; if(!token)return NextResponse.json({error:'Sanity är inte konfigurerat.'},{status:503});
  try{const ctx=await context();if('error'in ctx)return ctx.error;const owner=JSON.stringify(ctx.profile.sanity_profile_id);
    const listings=await query<Listing[]>(`*[_type=="product" && owner._ref==${owner}]|order(_createdAt desc){"id":_id,"slug":slug.current,brand,name,typeSv,category,dailyPrice,"listingStatus":coalesce(listingStatus,"active"),"image":images[0].asset->url,description,"createdAt":_createdAt}`,token);
    return NextResponse.json({listings,payoutReady:Boolean(ctx.profile.payout_method_ready)});
  }catch(e){console.error(e);return NextResponse.json({error:'Kunde inte läsa annonser.'},{status:500})}
}

export async function POST(request:Request){
  const token=process.env.SANITY_API_WRITE_TOKEN; if(!token)return NextResponse.json({error:'Sanity är inte konfigurerat.'},{status:503});
  try{const ctx=await context();if('error'in ctx)return ctx.error;const body=await request.json() as {id?:string;action?:string;values?:Record<string,unknown>};
    if(!body.id||!body.action)return NextResponse.json({error:'Ogiltig förfrågan.'},{status:400});
    const owner=JSON.stringify(ctx.profile.sanity_profile_id); const id=JSON.stringify(body.id);
    const existing=await query<any>(`*[_type=="product" && _id==${id} && owner._ref==${owner}][0]`,token); if(!existing)return NextResponse.json({error:'Annonsen hittades inte.'},{status:404});
    if(body.action==='pause'){await mutate([{patch:{id:body.id,set:{listingStatus:'paused'}}}],token);return NextResponse.json({ok:true,status:'paused'});}
    if(body.action==='activate'){if(!ctx.profile.payout_method_ready)return NextResponse.json({error:'Koppla utbetalningskonto innan annonsen aktiveras.'},{status:409});await mutate([{patch:{id:body.id,set:{listingStatus:'active'}}}],token);return NextResponse.json({ok:true,status:'active'});}
    if(body.action==='delete'){
      const {data:busy}=await ctx.admin.from('bookings').select('id').eq('product_id',body.id).in('status',['requested','reserved','accepted','paid','active','returned']).limit(1);
      if(busy?.length)return NextResponse.json({error:'Annonsen har en aktiv eller kommande bokning och kan inte tas bort.'},{status:409});
      await mutate([{delete:{id:body.id}}],token);return NextResponse.json({ok:true});
    }
    if(body.action==='duplicate'){
      const stamp=Date.now().toString(36); const newId=`product-${stamp}-${crypto.randomUUID().slice(0,6)}`; const baseSlug=existing.slug?.current||'annons';
      const copy={...existing,_id:newId,_type:'product',slug:{_type:'slug',current:`${baseSlug}-kopia-${stamp}`},listingStatus:'draft',name:`${existing.name||'Annons'} – kopia`};
      delete copy._rev;delete copy._createdAt;delete copy._updatedAt;
      await mutate([{create:copy}],token);return NextResponse.json({ok:true,id:newId,status:'draft'});
    }
    if(body.action==='update'){
      const v=body.values||{}; const allowed=['typeSv','category','brand','name','dailyPrice','description','included','multiDayDiscountPercent','weeklyDiscountPercent']; const set:Record<string,unknown>={};
      for(const key of allowed)if(key in v)set[key]=v[key];
      if(!Object.keys(set).length)return NextResponse.json({error:'Inga ändringar att spara.'},{status:400});
      await mutate([{patch:{id:body.id,set}}],token);return NextResponse.json({ok:true});
    }
    return NextResponse.json({error:'Okänd åtgärd.'},{status:400});
  }catch(e){console.error(e);return NextResponse.json({error:'Kunde inte uppdatera annonsen.'},{status:500})}
}
