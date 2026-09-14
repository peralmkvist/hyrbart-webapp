import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

type BookingLike = {
  id:string;
  owner_id:string;
  renter_id:string;
  pickup_due_at:string|null;
  return_due_at:string|null;
  rental_price?:number|null;
  currency?:string|null;
};

function estimateExtensionAmount(booking:BookingLike, returnedAt:string){
  if(!booking.return_due_at||!booking.pickup_due_at)return {overdueMinutes:0,amount:0};
  const due=new Date(booking.return_due_at).getTime();
  const returned=new Date(returnedAt).getTime();
  const overdueMinutes=Math.max(0,Math.ceil((returned-due)/60000));
  const scheduledHours=Math.max(1,(due-new Date(booking.pickup_due_at).getTime())/(60*60*1000));
  const effectiveHourlyRate=Math.max(0,Number(booking.rental_price||0)/scheduledHours);
  const billableHours=Math.ceil(overdueMinutes/60);
  return {overdueMinutes,amount:Math.round(billableHours*effectiveHourlyRate)};
}

export async function markLateReturn(booking:BookingLike, level:1|2|3, nowIso=new Date().toISOString()){
  if(!booking.return_due_at)return null;
  const admin=createAdminClient();
  const overdueMinutes=Math.max(0,Math.floor((new Date(nowIso).getTime()-new Date(booking.return_due_at).getTime())/60000));
  const payload={booking_id:booking.id,owner_id:booking.owner_id,renter_id:booking.renter_id,scheduled_return_at:booking.return_due_at,overdue_minutes:overdueMinutes,currency:booking.currency||'SEK',escalation_level:level,updated_at:nowIso};
  const {data,error}=await admin.from('booking_late_returns').upsert(payload,{onConflict:'booking_id'}).select('*').single();
  if(error)throw error;
  return data;
}

export async function resolveLateReturn(bookingId:string, returnedAt=new Date().toISOString()){
  const admin=createAdminClient();
  const {data:booking,error}=await admin.from('bookings').select('id,owner_id,renter_id,pickup_due_at,return_due_at,rental_price,currency').eq('id',bookingId).single();
  if(error)throw error;
  if(!booking.return_due_at||new Date(returnedAt).getTime()<=new Date(booking.return_due_at).getTime())return null;
  const {overdueMinutes,amount}=estimateExtensionAmount(booking,returnedAt);
  const {data:existing}=await admin.from('booking_late_returns').select('booking_id,escalation_level').eq('booking_id',bookingId).maybeSingle();
  const {data,error:updateError}=await admin.from('booking_late_returns').upsert({
    booking_id:booking.id,
    owner_id:booking.owner_id,
    renter_id:booking.renter_id,
    scheduled_return_at:booking.return_due_at,
    detected_at:existing?undefined:returnedAt,
    returned_at:returnedAt,
    overdue_minutes:overdueMinutes,
    estimated_extension_amount:amount,
    currency:booking.currency||'SEK',
    calculation_version:'effective-rate-v1',
    fee_status:'pending_review',
    escalation_level:Math.max(1,Number(existing?.escalation_level||1)),
    resolved_at:returnedAt,
    updated_at:returnedAt,
  },{onConflict:'booking_id'}).select('*').single();
  if(updateError)throw updateError;
  return data;
}
