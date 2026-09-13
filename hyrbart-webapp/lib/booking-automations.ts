import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { canBookingTransition } from '@/lib/booking-state';
import { recordBookingEvent } from '@/lib/booking-events';
import { notifyBookingParties } from '@/lib/notifications';
import { ensureScheduledPayout } from '@/lib/payment-ledger';

type BookingRow = { id:string;renter_id:string;owner_id:string;status:string;start_date:string;end_date:string;pickup_due_at:string|null;return_due_at:string|null;request_expires_at:string|null;reservation_expires_at:string|null;payment_due_at:string|null;auto_complete_at:string|null;currency?:string|null;rental_price?:number|null;service_fee?:number|null;total_price?:number|null; };
const HOUR = 60 * 60 * 1000;
const STALE_PROCESSING_MS = 15 * 60 * 1000;
function within(now:number,target:string|null,hoursBefore:number,windowMinutes=7){if(!target)return false;const fireAt=new Date(target).getTime()-hoursBefore*HOUR;return now>=fireAt&&now<fireAt+windowMinutes*60*1000;}
function overdue(now:number,target:string|null,hoursAfter:number){return Boolean(target&&now>=new Date(target).getTime()+hoursAfter*HOUR);}
function durationHours(booking:BookingRow){if(!booking.pickup_due_at||!booking.return_due_at)return 0;return(new Date(booking.return_due_at).getTime()-new Date(booking.pickup_due_at).getTime())/HOUR;}
function transient(error:unknown){const message=String((error as {message?:unknown})?.message??error);return /gateway timeout|timeout|econnreset|bad gateway|service unavailable|\b50[234]\b/i.test(message);}
async function retryQuery<T extends {error?:unknown}>(operation:()=>PromiseLike<T>,attempts=3){let result!:T;for(let attempt=1;attempt<=attempts;attempt++){result=await operation();if(!result.error||!transient(result.error)||attempt===attempts)return result;await new Promise(resolve=>setTimeout(resolve,150*attempt));}return result;}

async function beginEvent(bookingId:string,eventType:string,scheduledFor:string){
  const admin=createAdminClient();
  const eventKey=`${bookingId}:${eventType}:${scheduledFor}`;
  const{data,error}=await retryQuery(()=>admin.from('booking_automation_events').insert({booking_id:bookingId,event_type:eventType,event_key:eventKey,scheduled_for:scheduledFor,status:'processing',attempts:1}).select('id').maybeSingle());
  if(!error)return data?.id??null;
  if((error as {code?:string}).code!=='23505')throw error;
  const{data:existing,error:loadError}=await retryQuery(()=>admin.from('booking_automation_events').select('id,status,attempts,updated_at').eq('event_key',eventKey).maybeSingle());
  if(loadError)throw loadError;
  if(!existing||existing.status==='succeeded'||Number(existing.attempts||0)>=5)return null;
  const staleProcessing=existing.status==='processing'&&Date.now()-new Date(existing.updated_at).getTime()>=STALE_PROCESSING_MS;
  if(existing.status==='processing'&&!staleProcessing)return null;
  const patch={status:'processing',attempts:Number(existing.attempts||0)+1,last_error:staleProcessing?'Recovered stale processing event':null,updated_at:new Date().toISOString()};
  const{data:retried,error:retryError}=staleProcessing
    ? await retryQuery(()=>admin.from('booking_automation_events').update(patch).eq('id',existing.id).eq('status','processing').select('id').maybeSingle())
    : await retryQuery(()=>admin.from('booking_automation_events').update(patch).eq('id',existing.id).neq('status','processing').select('id').maybeSingle());
  if(retryError)throw retryError;
  return retried?.id??null;
}
async function finishEvent(id:string,error?:unknown){const admin=createAdminClient();const result=await retryQuery(()=>admin.from('booking_automation_events').update({status:error?'failed':'succeeded',executed_at:error?null:new Date().toISOString(),last_error:error?String(error instanceof Error?error.message:(error as {message?:unknown})?.message??error).slice(0,1000):null,updated_at:new Date().toISOString()}).eq('id',id));if(result.error)console.error('Could not finalize booking automation event',id,result.error);}
async function notifyBoth(booking:BookingRow,type:string,title:string,body:string,eventKey:string){await notifyBookingParties({renterId:booking.renter_id,ownerId:booking.owner_id,bookingId:booking.id,type,title,body,url:`/topsecret/sv/bokningar/${booking.id}`,eventKey});}
async function runOnce(booking:BookingRow,eventType:string,scheduledFor:string,action:()=>Promise<void>){const eventId=await beginEvent(booking.id,eventType,scheduledFor);if(!eventId)return false;try{await action();await finishEvent(eventId);return true}catch(error){await finishEvent(eventId,error);throw error;}}
async function expireBooking(booking:BookingRow,eventType:string,scheduledFor:string,reason:string){return runOnce(booking,eventType,scheduledFor,async()=>{if(!canBookingTransition(booking.status,'cancelled','system'))return;const admin=createAdminClient();const now=new Date().toISOString();const{data,error}=await admin.from('bookings').update({status:'cancelled',cancelled_at:now,cancelled_by:'system',updated_at:now}).eq('id',booking.id).eq('status',booking.status).select('id,status').maybeSingle();if(error)throw error;if(!data)return;await recordBookingEvent({bookingId:booking.id,eventType,metadata:{previous_status:booking.status,new_status:'cancelled',actor_role:'system',reason}});await notifyBoth(booking,eventType,'Bokningen löpte ut','Bokningen avslutades automatiskt eftersom tidsfristen passerade.',`${eventType}:${booking.id}`);});}

export async function processBookingAutomations(){
  const admin=createAdminClient();const now=Date.now();const horizon=new Date(now+25*HOUR).toISOString();
  const{data,error}=await retryQuery(()=>admin.from('bookings').select('id,renter_id,owner_id,status,start_date,end_date,pickup_due_at,return_due_at,request_expires_at,reservation_expires_at,payment_due_at,auto_complete_at,currency,rental_price,service_fee,total_price').in('status',['requested','reserved','accepted','paid','active','returned']).or(`request_expires_at.lte.${horizon},reservation_expires_at.lte.${horizon},payment_due_at.lte.${horizon},pickup_due_at.lte.${horizon},return_due_at.lte.${horizon},auto_complete_at.lte.${horizon}`).limit(500));if(error)throw error;
  let processed=0;
  for(const booking of(data??[])as BookingRow[]){try{
    if(booking.status==='requested'&&booking.request_expires_at&&now>=new Date(booking.request_expires_at).getTime()){if(await expireBooking(booking,'request_expired',booking.request_expires_at,'request_timeout'))processed++;continue;}
    if(booking.status==='reserved'&&booking.reservation_expires_at&&now>=new Date(booking.reservation_expires_at).getTime()){if(await expireBooking(booking,'reservation_expired',booking.reservation_expires_at,'reservation_timeout'))processed++;continue;}
    if(booking.status==='accepted'&&booking.payment_due_at&&now>=new Date(booking.payment_due_at).getTime()){if(await expireBooking(booking,'payment_expired',booking.payment_due_at,'payment_timeout'))processed++;continue;}
    const longBooking=durationHours(booking)>=72;
    if(booking.status==='paid'&&longBooking&&within(now,booking.pickup_due_at,24)){const scheduledFor=new Date(new Date(booking.pickup_due_at!).getTime()-24*HOUR).toISOString();if(await runOnce(booking,'pickup_reminder_24h',scheduledFor,()=>notifyBoth(booking,'pickup_reminder_24h','Uthyrning i morgon','Din bokning börjar om cirka 24 timmar.',`pickup-24h:${booking.id}`)))processed++;}
    if(booking.status==='paid'&&within(now,booking.pickup_due_at,2)){const scheduledFor=new Date(new Date(booking.pickup_due_at!).getTime()-2*HOUR).toISOString();if(await runOnce(booking,'pickup_reminder_2h',scheduledFor,()=>notifyBoth(booking,'pickup_reminder_2h','Uthyrning om 2 timmar','Det är snart dags för utlämning.',`pickup-2h:${booking.id}`)))processed++;}
    if(booking.status==='paid'&&overdue(now,booking.pickup_due_at,6)){const scheduledFor=new Date(new Date(booking.pickup_due_at!).getTime()+6*HOUR).toISOString();if(await runOnce(booking,'pickup_overdue',scheduledFor,async()=>{await recordBookingEvent({bookingId:booking.id,eventType:'pickup_overdue',metadata:{actor_role:'system',pickup_due_at:booking.pickup_due_at}});await notifyBoth(booking,'pickup_overdue','Utlämning inte bekräftad','Bokningen är fortfarande inte markerad som utlämnad.',`pickup-overdue:${booking.id}`);} ))processed++;}
    if(booking.status==='active'&&longBooking&&within(now,booking.return_due_at,24)){const scheduledFor=new Date(new Date(booking.return_due_at!).getTime()-24*HOUR).toISOString();if(await runOnce(booking,'return_reminder_24h',scheduledFor,()=>notifyBoth(booking,'return_reminder_24h','Återlämning i morgon','Din bokning ska återlämnas om cirka 24 timmar.',`return-24h:${booking.id}`)))processed++;}
    if(booking.status==='active'&&within(now,booking.return_due_at,2)){const scheduledFor=new Date(new Date(booking.return_due_at!).getTime()-2*HOUR).toISOString();if(await runOnce(booking,'return_reminder_2h',scheduledFor,()=>notifyBoth(booking,'return_reminder_2h','Återlämning om 2 timmar','Det är snart dags att återlämna objektet.',`return-2h:${booking.id}`)))processed++;}
    if(booking.status==='active'&&overdue(now,booking.return_due_at,2)){const scheduledFor=new Date(new Date(booking.return_due_at!).getTime()+2*HOUR).toISOString();if(await runOnce(booking,'return_overdue',scheduledFor,async()=>{await recordBookingEvent({bookingId:booking.id,eventType:'return_overdue',metadata:{actor_role:'system',return_due_at:booking.return_due_at}});await notifyBoth(booking,'return_overdue','Återlämning försenad','Bokningen är fortfarande inte markerad som återlämnad.',`return-overdue:${booking.id}`);} ))processed++;}
    if(booking.status==='returned'&&booking.auto_complete_at&&now>=new Date(booking.auto_complete_at).getTime()){if(await runOnce(booking,'auto_complete',booking.auto_complete_at,async()=>{if(!canBookingTransition('returned','completed','system'))return;const completedAt=new Date().toISOString();const{data:updated,error:updateError}=await admin.from('bookings').update({status:'completed',auto_complete_at:null,updated_at:completedAt}).eq('id',booking.id).eq('status','returned').select('id,status').maybeSingle();if(updateError)throw updateError;if(!updated)return;await recordBookingEvent({bookingId:booking.id,eventType:'booking_auto_completed',metadata:{previous_status:'returned',new_status:'completed',actor_role:'system'}});const payout=await ensureScheduledPayout(booking);await recordBookingEvent({bookingId:booking.id,eventType:'payout_scheduled',metadata:{payout_id:payout.id,amount:payout.amount,currency:payout.currency,provider:payout.provider,simulated:payout.provider==='simulation',actor_role:'system'}});await notifyBoth(booking,'booking_auto_completed','Bokningen är avslutad','Inga problem rapporterades inom 24 timmar efter återlämning.',`auto-complete:${booking.id}`);} ))processed++;}
  }catch(err){console.error('Booking automation failed',booking.id,err);}}
  return{scanned:data?.length??0,processed};
}
