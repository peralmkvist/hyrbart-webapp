import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {getProducts} from '@/lib/sanity-products';
import {sendPushToUser} from '@/lib/push';

const RENTER_REASONS=new Set(['Planerna ändrades','Behöver inte produkten längre','Problem med tid eller plats','Hittade ett annat alternativ','Annat']);
const OWNER_REASONS=new Set(['Produkten är inte tillgänglig','Problem med utlämningen','Produkten behöver repareras','Kan inte genomföra uthyrningen','Annat']);

function formatDateRange(from:string,to:string){const f=(v:string)=>new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${v}T12:00:00Z`));return `${f(from)} – ${f(to)}`}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const s=await createClient();const{data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
 const{data:b,error}=await s.from('bookings').select('id,owner_id,renter_id,product_id,start_date,end_date,status,total_price').eq('id',id).maybeSingle();
 if(error)throw error;if(!b||![b.owner_id,b.renter_id].includes(user.id))return NextResponse.json({error:'NOT_FOUND'},{status:404});
 const isOwner=b.owner_id===user.id,isRenter=b.renter_id===user.id;
 const allowed=isRenter?['requested','reserved','accepted','paid'].includes(b.status):['accepted','paid'].includes(b.status);
 if(!allowed)return NextResponse.json({error:'CANCELLATION_NOT_ALLOWED'},{status:409});
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:'INVALID_REQUEST'},{status:400})}
 const reason=String(body.reason||'').trim(),details=String(body.details||'').trim();const reasons=isOwner?OWNER_REASONS:RENTER_REASONS;
 if(!reasons.has(reason))return NextResponse.json({error:'INVALID_REASON'},{status:400});
 if(reason==='Annat'&&details.length<10)return NextResponse.json({error:'DETAILS_REQUIRED'},{status:400});
 const nextStatus=b.status==='paid'?'refunded':'cancelled';
 const{data:updated,error:updateError}=await s.from('bookings').update({status:nextStatus}).eq('id',id).select('id,status').single();if(updateError)throw updateError;
 await s.from('booking_events').insert({booking_id:id,actor_id:user.id,event_type:'booking_cancelled',metadata:{cancelled_by:isOwner?'owner':'renter',reason,details:details||null,previous_status:b.status,new_status:nextStatus,refund_amount:b.status==='paid'?Number(b.total_price||0):0,refund_mode:b.status==='paid'?'test_full_refund':'none'}});
 const recipientId=isOwner?b.renter_id:b.owner_id;const products=await getProducts();const product=products.find(x=>x.id===b.product_id);const productName=product?[product.brand,product.name].filter(Boolean).join(' '):'Bokningen';
 if(recipientId)await sendPushToUser(recipientId,{title:'Bokning avbokad',body:`${productName}\n${formatDateRange(b.start_date,b.end_date)}\nAnledning: ${reason}`,url:`/topsecret/sv/bokningar/${id}`,tag:`booking-cancelled-${id}`});
 return NextResponse.json({ok:true,status:updated.status,refundAmount:b.status==='paid'?Number(b.total_price||0):0,refundSimulated:b.status==='paid'});
}
