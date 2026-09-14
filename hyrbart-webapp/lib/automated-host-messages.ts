import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyUser } from '@/lib/notifications';

const TEMPLATE_BUCKET='automated-message-assets';
const BOOKING_BUCKET='booking-attachments';
const MAX_LATE_MS=6*60*60*1000;

type Template={id:string;owner_id:string;name:string;body:string;trigger_event:string;offset_minutes:number;all_listings:boolean};
type Booking={id:string;owner_id:string;renter_id:string;product_id:string;created_at:string;pickup_due_at:string|null;return_due_at:string|null;completed_at:string|null;status:string};
type EventRow={booking_id:string;event_type:string;metadata:any;created_at:string};

function targetTime(template:Template,booking:Booking,events:EventRow[]){
 let base:string|null=null;
 if(template.trigger_event==='booking_requested')base=booking.created_at;
 if(template.trigger_event==='pickup_due')base=booking.pickup_due_at;
 if(template.trigger_event==='return_due')base=booking.return_due_at;
 if(template.trigger_event==='booking_completed')base=booking.completed_at;
 if(template.trigger_event==='booking_accepted')base=events.find(event=>event.booking_id===booking.id&&event.event_type==='booking_status_changed'&&event.metadata?.new_status==='accepted')?.created_at||null;
 if(template.trigger_event==='booking_paid')base=events.find(event=>event.booking_id===booking.id&&event.event_type==='payment_captured')?.created_at||null;
 if(!base)return null;
 return new Date(new Date(base).getTime()+Number(template.offset_minutes||0)*60000);
}

async function copyTemplateAsset(admin:any,asset:any,bookingId:string){
 const{data,error}=await admin.storage.from(TEMPLATE_BUCKET).download(asset.storage_path);if(error||!data)throw error||new Error('Template asset missing');
 const ext=(asset.file_name?.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`${bookingId}/auto-${crypto.randomUUID()}.${ext}`;
 const bytes=new Uint8Array(await data.arrayBuffer());const{error:uploadError}=await admin.storage.from(BOOKING_BUCKET).upload(path,bytes,{contentType:asset.content_type,upsert:false});if(uploadError)throw uploadError;
 return path;
}

async function deliver(template:Template,booking:Booking,assets:any[],eventKey:string){
 const admin=createAdminClient();
 const{data:existing}=await admin.from('automated_message_deliveries').select('id').eq('event_key',eventKey).maybeSingle();if(existing)return false;
 const copied:string[]=[];
 try{
  if(assets.length){
   const first=assets[0];const path=await copyTemplateAsset(admin,first,booking.id);copied.push(path);
   const{error}=await admin.from('booking_messages').insert({booking_id:booking.id,sender_id:template.owner_id,body:template.body,attachment_path:path,attachment_name:first.file_name,attachment_type:first.content_type,attachment_size:first.size_bytes});if(error)throw error;
   for(const asset of assets.slice(1)){const nextPath=await copyTemplateAsset(admin,asset,booking.id);copied.push(nextPath);const{error:assetError}=await admin.from('booking_messages').insert({booking_id:booking.id,sender_id:template.owner_id,body:'',attachment_path:nextPath,attachment_name:asset.file_name,attachment_type:asset.content_type,attachment_size:asset.size_bytes});if(assetError)throw assetError;}
  }else{
   const{error}=await admin.from('booking_messages').insert({booking_id:booking.id,sender_id:template.owner_id,body:template.body});if(error)throw error;
  }
  const{error:deliveryError}=await admin.from('automated_message_deliveries').insert({template_id:template.id,booking_id:booking.id,event_key:eventKey});if(deliveryError)throw deliveryError;
  await notifyUser({userId:booking.renter_id,bookingId:booking.id,type:'booking_message',title:'Nytt meddelande från uthyraren',body:template.body.length>120?`${template.body.slice(0,117)}…`:template.body,url:`/topsecret/sv/bokningar/${booking.id}`,eventKey:`automated-message:${eventKey}`});
  return true;
 }catch(error){if(copied.length)await admin.storage.from(BOOKING_BUCKET).remove(copied);throw error;}
}

export async function processAutomatedHostMessages(){
 const admin=createAdminClient();const now=Date.now();
 const{data:templates,error:templateError}=await admin.from('automated_message_templates').select('id,owner_id,name,body,trigger_event,offset_minutes,all_listings').eq('enabled',true);if(templateError)throw templateError;
 if(!templates?.length)return{templates:0,deliveries:0};
 const owners=[...new Set(templates.map(item=>item.owner_id))];
 const{data:bookings,error:bookingError}=await admin.from('bookings').select('id,owner_id,renter_id,product_id,created_at,pickup_due_at,return_due_at,completed_at,status').in('owner_id',owners).not('status','in','("cancelled","declined","refunded")').gte('created_at',new Date(now-90*24*60*60*1000).toISOString()).limit(2000);if(bookingError)throw bookingError;
 const bookingIds=(bookings??[]).map(item=>item.id);
 const[{data:events},{data:links},{data:assets}]=await Promise.all([
  bookingIds.length?admin.from('booking_events').select('booking_id,event_type,metadata,created_at').in('booking_id',bookingIds).in('event_type',['booking_status_changed','payment_captured']):Promise.resolve({data:[]}),
  admin.from('automated_message_template_listings').select('template_id,product_id').in('owner_id',owners),
  admin.from('automated_message_template_assets').select('template_id,storage_path,file_name,content_type,size_bytes,position').in('owner_id',owners).order('position'),
 ]);
 let deliveries=0;
 for(const template of templates as Template[]){
  const allowedProducts=new Set((links??[]).filter((row:any)=>row.template_id===template.id).map((row:any)=>row.product_id));
  for(const booking of (bookings??[]) as Booking[]){
   if(booking.owner_id!==template.owner_id)continue;if(!template.all_listings&&!allowedProducts.has(booking.product_id))continue;
   const target=targetTime(template,booking,(events??[]) as EventRow[]);if(!target)continue;const targetMs=target.getTime();if(targetMs>now||now-targetMs>MAX_LATE_MS)continue;
   const eventKey=`${template.id}:${booking.id}:${template.trigger_event}:${target.toISOString()}`;
   try{if(await deliver(template,booking,(assets??[]).filter((row:any)=>row.template_id===template.id),eventKey))deliveries++;}catch(error){console.error('Automated host message failed',template.id,booking.id,error);}
  }
 }
 return{templates:templates.length,deliveries};
}
