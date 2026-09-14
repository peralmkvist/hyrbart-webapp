import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(){
  const user=await requireAdmin();
  if(!user)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const admin=createAdminClient();
  const {data:reports,error}=await admin.from('booking_message_reports').select('id,message_id,booking_id,reporter_id,reported_user_id,reason,details,status,created_at').order('created_at',{ascending:false}).limit(200);
  if(error)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  const messageIds=[...new Set((reports||[]).map((r:any)=>r.message_id))];
  const userIds=[...new Set((reports||[]).flatMap((r:any)=>[r.reporter_id,r.reported_user_id]))];
  const [{data:messages},{data:profiles}]=await Promise.all([
    messageIds.length?admin.from('booking_messages').select('id,body,created_at,attachment_name,attachment_type').in('id',messageIds):Promise.resolve({data:[]}),
    userIds.length?admin.from('profiles').select('id,display_name').in('id',userIds):Promise.resolve({data:[]}),
  ]);
  const mm=new Map((messages||[]).map((m:any)=>[m.id,m])),pm=new Map((profiles||[]).map((p:any)=>[p.id,p]));
  return NextResponse.json({reports:(reports||[]).map((r:any)=>({...r,message:mm.get(r.message_id)||null,reporter:pm.get(r.reporter_id)||null,reportedUser:pm.get(r.reported_user_id)||null}))},{headers:{'cache-control':'private, no-store'}});
}
