import { createAdminClient } from '@/lib/supabase/admin';

export type ResponseTimeStats={minutes:number|null;samples:number;windowDays:number};
const WINDOW_DAYS=90,MIN_SAMPLES=3,MAX_SAMPLE_MINUTES=72*60;

export async function getOwnerResponseTime(ownerId:string):Promise<ResponseTimeStats>{
  const admin=createAdminClient();
  const since=new Date(Date.now()-WINDOW_DAYS*86400000).toISOString();
  const {data:bookings}=await admin.from('bookings').select('id').eq('owner_id',ownerId).gte('created_at',since);
  const ids=(bookings||[]).map(row=>row.id);if(!ids.length)return{minutes:null,samples:0,windowDays:WINDOW_DAYS};
  const {data:messages}=await admin.from('booking_messages').select('booking_id,sender_id,created_at').in('booking_id',ids).gte('created_at',since).order('created_at',{ascending:true});
  const grouped=new Map<string,{sender_id:string;created_at:string}[]>();for(const m of messages||[]){const list=grouped.get(m.booking_id)||[];list.push(m);grouped.set(m.booking_id,list)}
  const samples:number[]=[];
  for(const list of grouped.values()){
    let waitingSince:string|null=null;
    for(const m of list){
      if(m.sender_id!==ownerId){if(!waitingSince)waitingSince=m.created_at;continue}
      if(waitingSince){const mins=(new Date(m.created_at).getTime()-new Date(waitingSince).getTime())/60000;if(mins>=0&&mins<=MAX_SAMPLE_MINUTES)samples.push(mins);waitingSince=null}
    }
  }
  if(samples.length<MIN_SAMPLES)return{minutes:null,samples:samples.length,windowDays:WINDOW_DAYS};
  const average=samples.reduce((a,b)=>a+b,0)/samples.length;
  return{minutes:Math.max(1,Math.round(average)),samples:samples.length,windowDays:WINDOW_DAYS};
}

export function formatResponseTime(minutes:number|null,locale:string){const en=locale==='en';if(minutes==null)return en?'Not enough data yet':'Inte tillräckligt med data';if(minutes<=5)return en?'Replies in a few minutes':'Svarar inom några minuter';if(minutes<=15)return en?'Usually replies within 15 minutes':'Svarar oftast inom 15 minuter';if(minutes<=30)return en?'Usually replies within 30 minutes':'Svarar oftast inom 30 minuter';if(minutes<=60)return en?'Usually replies within 1 hour':'Svarar oftast inom 1 timme';if(minutes<=180)return en?'Usually replies within 3 hours':'Svarar oftast inom 3 timmar';if(minutes<=720)return en?'Usually replies within 12 hours':'Svarar oftast inom 12 timmar';if(minutes<=1440)return en?'Usually replies within a day':'Svarar oftast inom en dag';return en?'Usually replies within a few days':'Svarar oftast inom några dagar'}
