import {NextResponse} from 'next/server';
import {getAdminAccess} from '@/lib/admin';
import {clearAdminSessionCookie,hashAdminSessionToken,readAdminSessionToken,sameOrigin} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {recordAdminAction} from '@/lib/admin-audit';

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const access=await getAdminAccess();
  const token=await readAdminSessionToken();
  if(token){
    const admin=createAdminClient();
    const tokenHash=hashAdminSessionToken(token);
    const now=new Date().toISOString();
    const {data:session}=await admin.from('admin_sessions').update({revoked_at:now,revoke_reason:'logout'}).eq('token_hash',tokenHash).is('revoked_at',null).select('id').maybeSingle();
    if(access&&session){
      await recordAdminAction({adminUserId:access.user.id,adminRole:access.role,action:'admin_logout',entityType:'admin_session',entityId:session.id});
    }
  }
  await clearAdminSessionCookie();
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
