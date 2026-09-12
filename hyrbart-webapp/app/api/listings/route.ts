import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const projectId='djps09z6';
const dataset='production';
const apiVersion='2026-09-08';

function slugify(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)}
async function sanityQuery<T>(query:string,token:string){const response=await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});if(!response.ok)throw new Error(`Sanity query failed (${response.status})`);const json=await response.json() as {result:T};return json.result}
async function uploadImage(file:File,token:string){const buffer=Buffer.from(await file.arrayBuffer());const response=await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/assets/images/${dataset}?filename=${encodeURIComponent(file.name)}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':file.type||'application/octet-stream'},body:buffer});if(!response.ok)throw new Error(`Image upload failed (${response.status})`);const json=await response.json() as {document?:{_id?:string}};if(!json.document?._id)throw new Error('Sanity returned no image asset id.');return json.document._id}

export async function POST(request:Request){
  const token=process.env.SANITY_API_WRITE_TOKEN;
  if(!token)return NextResponse.json({error:'SANITY_API_WRITE_TOKEN saknas i Vercel.'},{status:500});
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Logga in för att skapa en annons.'},{status:401});

    const {data:profile,error:profileError}=await supabase.from('profiles').select('sanity_profile_id,payout_method_ready,payout_provider_account_id,bankid_verified').eq('id',user.id).maybeSingle();
    if(profileError)throw profileError;
    if(!profile?.sanity_profile_id)return NextResponse.json({error:'Din uthyrarprofil är inte färdigkonfigurerad.'},{status:409});

    const form=await request.formData();
    const get=(key:string)=>String(form.get(key)||'').trim();
    const mode=get('mode')==='draft'?'draft':'publish';
    if(mode==='publish'&&!(profile.payout_method_ready&&profile.payout_provider_account_id))return NextResponse.json({error:'Koppla ett utbetalningskonto innan du kan publicera en annons.',code:'PAYOUT_METHOD_REQUIRED'},{status:409});
    if(mode==='publish'&&!profile.bankid_verified)return NextResponse.json({error:'Verifiera din identitet med BankID innan du kan publicera en annons.',code:'BANKID_REQUIRED'},{status:409});

    const typeSv=get('typeSv'); const category=get('category'); const brand=get('brand'); const name=get('name'); const description=get('description'); const city=get('city');
    const dailyPrice=Number(get('dailyPrice')); const multiDayDiscountPercent=Number(get('multiDay')||0); const weeklyDiscountPercent=Number(get('weekly')||0); const availableNow=get('availableNow')!=='false';
    if(mode==='publish'&&(!typeSv||!category||!name||!description||!dailyPrice))return NextResponse.json({error:'Fyll i alla obligatoriska fält.'},{status:400});
    if(mode==='draft'&&!name&&!typeSv)return NextResponse.json({error:'Lägg till minst produkttyp eller produktnamn innan du sparar utkast.'},{status:400});

    const imageFiles=form.getAll('images').filter((item):item is File=>item instanceof File&&item.size>0);
    const assetIds:string[]=[]; for(const file of imageFiles.slice(0,8))assetIds.push(await uploadImage(file,token));
    const owner=await sanityQuery<{_id?:string}|null>(`*[_type=="userProfile" && _id==${JSON.stringify(profile.sanity_profile_id)}][0]{_id}`,token);
    if(!owner?._id)return NextResponse.json({error:'Din uthyrarprofil kunde inte hittas.'},{status:409});
    const pickup=await sanityQuery<{_id?:string}|null>(`*[_type=="pickupLocation" && owner._ref==${JSON.stringify(owner._id)}]|order(_createdAt asc)[0]{_id}`,token);
    const included=get('included').split('\n').map(v=>v.trim()).filter(Boolean).map((sv,index)=>({_key:`included-${index}-${Date.now()}`,_type:'localizedString',sv}));
    const slugBase=slugify([brand,name].filter(Boolean).join('-')||typeSv||'annons'); const slug=`${slugBase}-${Date.now().toString(36).slice(-5)}`; const productId=`product-${slug}`;
    const doc:{[key:string]:unknown}={_id:productId,_type:'product',category,typeSv,brand,name,slug:{_type:'slug',current:slug},description:{_type:'localizedText',sv:description},dailyPrice:dailyPrice||undefined,multiDayDiscountPercent,weeklyDiscountPercent,included,owner:{_type:'reference',_ref:owner._id},listingStatus:mode==='draft'?'draft':'active'};
    const highlight=get('highlight'); if(highlight)doc.cardHighlight={_type:'localizedString',sv:highlight}; if(pickup?._id)doc.pickupLocation={_type:'reference',_ref:pickup._id}; if(assetIds.length)doc.images=assetIds.map((id,index)=>({_key:`image-${index}-${Date.now()}`,_type:'image',asset:{_type:'reference',_ref:id}})); if(city&&!pickup?._id)doc.detailCategory={_type:'localizedString',sv:city};
    const mutations:Array<Record<string,unknown>>=[{create:doc}];
    if(mode==='publish'&&!availableNow)mutations.push({patch:{id:productId,set:{listingStatus:'paused'}}});
    const mutation=await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}?returnIds=true`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mutations})});
    if(!mutation.ok){const text=await mutation.text();throw new Error(`Sanity mutation failed (${mutation.status}): ${text.slice(0,220)}`)}
    return NextResponse.json({ok:true,slug,id:productId,status:mode==='draft'?'draft':availableNow?'active':'paused'});
  }catch(error){console.error('Could not create listing',error);return NextResponse.json({error:error instanceof Error?error.message:'Kunde inte skapa annonsen.'},{status:500})}
}
