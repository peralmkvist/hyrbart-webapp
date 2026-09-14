import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';

export type RentalRule={minRentalMinutes:number;maxRentalMinutes:number|null;bufferMinutes:number};
export type RentalRuleViolation='MIN_DURATION'|'MAX_DURATION'|'BUFFER_CONFLICT';
const ACTIVE=['requested','reserved','accepted','paid','active','returned'];

export async function getRentalRule(productId:string):Promise<RentalRule>{
  const admin=createAdminClient();
  const {data,error}=await admin.from('listing_rental_rules').select('min_rental_minutes,max_rental_minutes,buffer_minutes').eq('product_id',productId).maybeSingle();
  if(error)throw error;
  return {minRentalMinutes:data?.min_rental_minutes??0,maxRentalMinutes:data?.max_rental_minutes??null,bufferMinutes:data?.buffer_minutes??0};
}

export function durationViolation(rule:RentalRule,startAt:string,endAt:string):RentalRuleViolation|null{
  const duration=(new Date(endAt).getTime()-new Date(startAt).getTime())/60000;
  if(rule.minRentalMinutes>0&&duration<rule.minRentalMinutes)return'MIN_DURATION';
  if(rule.maxRentalMinutes!==null&&duration>rule.maxRentalMinutes)return'MAX_DURATION';
  return null;
}

export async function bufferedConflict(productId:string,startAt:string,endAt:string,bufferMinutes:number){
  if(bufferMinutes<=0)return false;
  const admin=createAdminClient();
  const fromMs=new Date(startAt).getTime()-bufferMinutes*60000;
  const toMs=new Date(endAt).getTime()+bufferMinutes*60000;
  const {data,error}=await admin.from('bookings').select('id,start_date,end_date,rental_start_at,return_due_at').eq('product_id',productId).in('status',ACTIVE);
  if(error)throw error;
  return (data??[]).some(row=>{
    const existingStart=new Date(row.rental_start_at||`${row.start_date}T00:00:00Z`).getTime();
    const existingEnd=new Date(row.return_due_at||`${row.end_date}T23:59:59Z`).getTime();
    return fromMs<existingEnd&&toMs>existingStart;
  });
}

export async function validateRentalRules(productId:string,startAt:string,endAt:string){
  const rule=await getRentalRule(productId);
  const violation=durationViolation(rule,startAt,endAt);
  if(violation)return{ok:false as const,code:violation,rule};
  if(await bufferedConflict(productId,startAt,endAt,rule.bufferMinutes))return{ok:false as const,code:'BUFFER_CONFLICT' as const,rule};
  return{ok:true as const,rule};
}
