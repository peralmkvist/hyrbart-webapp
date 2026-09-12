import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(){
  const user=await requireAdmin();
  if(!user)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const admin=createAdminClient();
  const {data:jobs,error}=await admin.from('listing_import_jobs').select('*').order('created_at',{ascending:false}).limit(200);
  if(error)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  const userIds=[...new Set((jobs||[]).map((job:any)=>job.user_id))];
  const {data:profiles}=userIds.length?await admin.from('profiles').select('id,display_name,email,city').in('id',userIds):{data:[] as any[]};
  const profileMap=new Map((profiles||[]).map((profile:any)=>[profile.id,profile]));
  return NextResponse.json({jobs:(jobs||[]).map((job:any)=>({...job,profile:profileMap.get(job.user_id)||null}))});
}
