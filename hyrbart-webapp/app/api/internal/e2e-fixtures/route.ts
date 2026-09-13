import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireGithubActionsOidc } from '@/lib/e2e/github-oidc';

export const dynamic = 'force-dynamic';

const PRODUCT_ID = 'bosch-glm-40';
const CONDITION_BUCKET = 'booking-condition-photos';
const SANITY_PROJECT_ID = 'djps09z6';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2026-09-08';
type Label = 'lifecycle' | 'cancellation' | 'dispute' | 'race';
type SessionShape = { access_token:string; refresh_token:string; expires_at?:number; expires_in:number; token_type:string };
type TestUser = { id:string; email:string; session:SessionShape };
type BookingSeed = { label:Label; id:string };
type SanityProductSeed = { _id:string; assetIds?:string[] };

function safeRunId(value:unknown){const raw=String(value||'').trim().toLowerCase();const sanitized=raw.replace(/[^a-z0-9_-]/g,'-').slice(0,48);return sanitized||crypto.randomUUID().slice(0,12)}
function isoDate(days:number){return new Date(Date.now()+days*86400000).toISOString().slice(0,10)}
function productIdForRun(runId:string){return `${PRODUCT_ID}-e2e-${runId}`.slice(0,120)}
function sanityProfileId(runId:string){return `e2e-user-${runId}`.slice(0,120)}
function sanityPickupId(runId:string){return `e2e-pickup-${runId}`.slice(0,120)}
async function authenticate(request:Request){try{return await requireGithubActionsOidc(request)}catch(error){console.warn('Rejected E2E fixture request',error);return null}}

function sanityToken(){const token=process.env.SANITY_API_WRITE_TOKEN;if(!token)throw new Error('SANITY_API_WRITE_TOKEN is required for production E2E fixtures.');return token}
async function sanityMutate(mutations:any[]){
  const response=await fetch(`https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${SANITY_DATASET}?returnIds=true`,{method:'POST',headers:{Authorization:`Bearer ${sanityToken()}`,'Content-Type':'application/json'},body:JSON.stringify({mutations}),cache:'no-store'});
  if(!response.ok)throw new Error(`Sanity mutation failed (${response.status}): ${await response.text()}`);
  return response.json();
}
async function sanityQuery<T>(query:string):Promise<T>{
  const response=await fetch(`https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`,{headers:{Authorization:`Bearer ${sanityToken()}`},cache:'no-store'});
  if(!response.ok)throw new Error(`Sanity query failed (${response.status})`);
  return((await response.json())as{result:T}).result;
}
async function seedSanityOwner(runId:string){
  const profileId=sanityProfileId(runId),pickupId=sanityPickupId(runId);
  await sanityMutate([
    {create:{_id:profileId,_type:'userProfile',displayName:'E2E Uthyrare',city:'Test'}},
    {create:{_id:pickupId,_type:'pickupLocation',name:'E2E utlämning',owner:{_type:'reference',_ref:profileId},city:'Test',area:'Testområde',address:'E2E-gatan 1',location:{_type:'geopoint',lat:59.332,lng:18.064}}},
  ]);
  return {profileId,pickupId};
}
async function cleanupSanity(runId:string){
  const profileId=sanityProfileId(runId),pickupId=sanityPickupId(runId);
  const products=await sanityQuery<SanityProductSeed[]>(`*[_type=="product"&&owner._ref==${JSON.stringify(profileId)}]{_id,"assetIds":images[].asset._ref}`);
  if(products.length)await sanityMutate(products.map(product=>({delete:{id:product._id}})));
  const assetIds=Array.from(new Set(products.flatMap(product=>product.assetIds||[]).filter(Boolean)));
  if(assetIds.length){try{await sanityMutate(assetIds.map(id=>({delete:{id}})))}catch(error){console.warn('Could not remove E2E Sanity image assets',error)}}
  try{await sanityMutate([{delete:{id:pickupId}},{delete:{id:profileId}}])}catch(error){console.warn('Could not remove E2E Sanity owner documents',error)}
}

async function makeTestUser(role:'renter'|'owner',runId:string):Promise<TestUser>{
  const admin=createAdminClient(); const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error('Supabase public environment variables are missing.');
  const suffix=crypto.randomUUID().replace(/-/g,'').slice(0,12); const email=`e2e-${role}-${runId}-${suffix}@hyrbart.invalid`; const password=`E2e-${crypto.randomUUID()}!`;
  const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{hyrbart_e2e:true,run_id:runId,role},user_metadata:{display_name:`E2E ${role}`}});
  if(createError||!created.user)throw createError||new Error('Could not create E2E user.');
  const userId=created.user.id;
  try{
    const owner=role==='owner';
    const {error:profileError}=await admin.from('profiles').upsert({id:userId,display_name:role==='renter'?'E2E Hyrestagare':'E2E Uthyrare',first_name:role==='renter'?'E2E Renter':'E2E Owner',last_name:'CI',city:'Test',payment_method_ready:role==='renter',payout_method_ready:owner,payout_provider_account_id:owner?`e2e-${runId}`:null,sanity_profile_id:owner?sanityProfileId(runId):null,bankid_verified:true,identity_verification_status:'verified',account_status:'active',updated_at:new Date().toISOString()});
    if(profileError)throw profileError;
    const authClient=createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data:signedIn,error:signInError}=await authClient.auth.signInWithPassword({email,password});
    if(signInError||!signedIn.session)throw signInError||new Error('Could not sign in E2E user.');
    const session=signedIn.session;
    return {id:userId,email,session:{access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at,expires_in:session.expires_in,token_type:session.token_type}};
  }catch(error){
    const {error:deleteError}=await admin.auth.admin.deleteUser(userId);
    if(deleteError)console.warn('Could not roll back partially created E2E user',userId,deleteError.message);
    throw error;
  }
}

async function seedBookings(renterId:string,ownerId:string,runId:string):Promise<BookingSeed[]>{
  const admin=createAdminClient();
  const productId=productIdForRun(runId);
  const definitions:{label:Label;offset:number}[]=[{label:'lifecycle',offset:14},{label:'cancellation',offset:18},{label:'dispute',offset:22},{label:'race',offset:26}];
  const rows=definitions.map(({label,offset})=>{
    const rentalStartAt=new Date(Date.now()+offset*86400000).toISOString();
    return {renter_id:renterId,owner_id:ownerId,product_id:productId,start_date:isoDate(offset),end_date:isoDate(offset+1),status:'requested',currency:'SEK',rental_price:1000,service_fee:100,request_type:'booking',message:`Authenticated E2E ${runId} ${label}`,cancellation_policy:'moderate',rental_start_at:rentalStartAt,pickup_due_at:rentalStartAt,return_due_at:new Date(Date.now()+(offset+1)*86400000).toISOString(),pickup_time:'10:00:00',return_time:'10:00:00',terms_version:'e2e',terms_accepted_at:new Date().toISOString(),terms_locale:'sv',request_expires_at:new Date(Date.now()+86400000).toISOString()};
  });
  const {data,error}=await admin.from('bookings').insert(rows).select('id,message'); if(error)throw error;
  const prefix=`Authenticated E2E ${runId} `;
  return (data||[]).map(row=>({label:String(row.message||'').replace(prefix,'') as Label,id:row.id}));
}

async function removeConditionObjects(ids:string[]){const admin=createAdminClient();for(const id of ids){for(const stage of ['pickup','return']){const {data}=await admin.storage.from(CONDITION_BUCKET).list(`${id}/${stage}`,{limit:100});const paths=(data||[]).map(item=>`${id}/${stage}/${item.name}`);if(paths.length)await admin.storage.from(CONDITION_BUCKET).remove(paths)}}}
async function removeBookingsForUsers(userIds:string[]){
  if(!userIds.length)return;
  const admin=createAdminClient();
  const filters=userIds.flatMap(id=>[`renter_id.eq.${id}`,`owner_id.eq.${id}`]).join(',');
  const {data,error}=await admin.from('bookings').select('id').or(filters);if(error)throw error;
  const ids=(data||[]).map(row=>String(row.id));
  if(ids.length){await removeConditionObjects(ids);const {error:deleteError}=await admin.from('bookings').delete().in('id',ids);if(deleteError)throw deleteError}
}

async function rollbackFailedSeed(runId:string,users:Array<TestUser|undefined>){
  const admin=createAdminClient();
  try{await removeBookingsForUsers(users.filter(Boolean).map(user=>user!.id))}catch(error){console.warn('Could not roll back E2E bookings after failed seed',runId,error)}
  try{await cleanupSanity(runId)}catch(error){console.warn('Could not roll back E2E Sanity data after failed seed',runId,error)}
  for(const user of users){
    if(!user)continue;
    const {error}=await admin.auth.admin.deleteUser(user.id);
    if(error)console.warn('Could not roll back E2E auth user after failed seed',user.id,error.message);
  }
}

export async function POST(request:Request){
  const claims=await authenticate(request); if(!claims)return NextResponse.json({error:'NOT_FOUND'},{status:404});
  const body=await request.json().catch(()=>({}));
  const runId=safeRunId(body.runId||claims.sha);
  let renter:TestUser|undefined;
  let owner:TestUser|undefined;
  try{
    await seedSanityOwner(runId);
    renter=await makeTestUser('renter',runId);
    owner=await makeTestUser('owner',runId);
    const bookings=await seedBookings(renter.id,owner.id,runId);
    return NextResponse.json({ok:true,runId,users:{renter,owner},bookings:Object.fromEntries(bookings.map(item=>[item.label,item.id])),sanity:{ownerProfileId:sanityProfileId(runId),pickupLocationId:sanityPickupId(runId)},supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL,publishableKey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY},{headers:{'cache-control':'no-store'}})
  }catch(error){
    await rollbackFailedSeed(runId,[owner,renter]);
    console.error('E2E fixture seed failed',error);
    return NextResponse.json({error:'E2E_FIXTURE_FAILED'},{status:500})
  }
}

export async function DELETE(request:Request){
  const claims=await authenticate(request);if(!claims)return NextResponse.json({error:'NOT_FOUND'},{status:404});
  try{
    const body=await request.json().catch(()=>({}));const runId=safeRunId(body.runId);const bookingIds=Array.isArray(body.bookingIds)?body.bookingIds.map(String):[];const userIds=Array.isArray(body.userIds)?body.userIds.map(String):[];const admin=createAdminClient();
    if(!body.runId||bookingIds.length>8||userIds.length>4)return NextResponse.json({error:'INVALID_CLEANUP_SCOPE'},{status:400});
    for(const userId of userIds){const {data,error}=await admin.auth.admin.getUserById(userId);if(error||!data.user)throw error||new Error('E2E user not found.');const metadata=data.user.app_metadata||{};if(metadata.hyrbart_e2e!==true||metadata.run_id!==runId)return NextResponse.json({error:'CLEANUP_SCOPE_REJECTED'},{status:403})}
    if(bookingIds.length){const {data:rows,error:checkError}=await admin.from('bookings').select('id,message').in('id',bookingIds);if(checkError)throw checkError;const expected=`Authenticated E2E ${runId} `;if((rows||[]).some(row=>!String(row.message||'').startsWith(expected)))return NextResponse.json({error:'CLEANUP_SCOPE_REJECTED'},{status:403})}
    await removeBookingsForUsers(userIds);
    await cleanupSanity(runId);
    for(const userId of userIds){const {error}=await admin.auth.admin.deleteUser(userId);if(error)console.warn('Could not delete E2E auth user',userId,error.message)}
    return NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}})
  }catch(error){console.error('E2E fixture cleanup failed',error);return NextResponse.json({error:'E2E_CLEANUP_FAILED'},{status:500})}
}
