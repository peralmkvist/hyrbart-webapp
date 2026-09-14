import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

const projectId='djps09z6',dataset='production',apiVersion='2026-09-08';
const queryUrl=`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`;

async function context(){
  const supabase=await createClient();
  const admin=createAdminClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;
  const {data:profile,error}=await admin.from('profiles').select('sanity_profile_id').eq('id',user.id).maybeSingle();
  if(error)throw error;
  return{user,profile,admin};
}

async function ownsProduct(productId:string,sanityProfileId:string){
  const q=`count(*[_type=="product"&&_id==${JSON.stringify(productId)}&&owner._ref==${JSON.stringify(sanityProfileId)}&&listingStatus!="deleted"]) > 0`;
  const res=await fetch(`${queryUrl}?query=${encodeURIComponent(q)}`,{cache:'no-store'});
  if(!res.ok)throw new Error(`Sanity query ${res.status}`);
  return Boolean(((await res.json())as{result:boolean}).result);
}

export async function GET(){
  try{
    const c=await context();
    if(!c)return NextResponse.json({error:'Inte inloggad.'},{status:401});
    const {data,error}=await c.admin.from('listing_rental_rules').select('product_id,min_rental_minutes,max_rental_minutes,buffer_minutes,updated_at').eq('owner_id',c.user.id).order('updated_at',{ascending:false});
    if(error)throw error;
    return NextResponse.json({rules:data??[]},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){console.error(error);return NextResponse.json({error:'Kunde inte läsa uthyrningsregler.'},{status:500});}
}

export async function PATCH(request:Request){
  try{
    const c=await context();
    if(!c)return NextResponse.json({error:'Inte inloggad.'},{status:401});
    if(!c.profile?.sanity_profile_id)return NextResponse.json({error:'Uthyrarprofil saknas.'},{status:409});
    const body=await request.json().catch(()=>({}));
    const productId=String(body.productId||'').trim();
    const min=Number(body.minRentalMinutes);
    const max=body.maxRentalMinutes===null||body.maxRentalMinutes===''?null:Number(body.maxRentalMinutes);
    const buffer=Number(body.bufferMinutes);
    if(!productId||!Number.isInteger(min)||min<0||min>525600||!Number.isInteger(buffer)||buffer<0||buffer>10080||!(max===null||(Number.isInteger(max)&&max>=1&&max<=525600))||(max!==null&&max<min)){
      return NextResponse.json({error:'Ogiltiga uthyrningsregler.'},{status:400});
    }
    if(!(await ownsProduct(productId,c.profile.sanity_profile_id)))return NextResponse.json({error:'Annonsen hittades inte.'},{status:404});
    const {data,error}=await c.admin.from('listing_rental_rules').upsert({product_id:productId,owner_id:c.user.id,min_rental_minutes:min,max_rental_minutes:max,buffer_minutes:buffer,updated_at:new Date().toISOString()},{onConflict:'product_id'}).select('product_id,min_rental_minutes,max_rental_minutes,buffer_minutes,updated_at').single();
    if(error)throw error;
    return NextResponse.json({ok:true,rule:data},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){console.error(error);return NextResponse.json({error:'Kunde inte spara uthyrningsregler.'},{status:500});}
}
