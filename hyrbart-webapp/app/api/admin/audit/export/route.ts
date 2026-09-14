import {getAdminAccess} from '@/lib/admin';
import {recordAdminAction} from '@/lib/admin-audit';
import {createAdminClient} from '@/lib/supabase/admin';

function csv(value:unknown){const s=value==null?'':typeof value==='string'?value:JSON.stringify(value);return `"${s.replace(/"/g,'""')}"`}

export async function GET(request:Request){
  const access=await getAdminAccess('audit.export');
  if(!access)return new Response('Forbidden',{status:403});
  const url=new URL(request.url);
  const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||1000),1),5000);
  const admin=createAdminClient();
  const {data,error}=await admin.from('admin_audit_log').select('id,created_at,admin_user_id,admin_role,action,entity_type,entity_id,request_id,metadata').order('created_at',{ascending:false}).limit(limit);
  if(error)throw error;
  const rows=data||[];
  const header=['id','created_at','admin_user_id','admin_role','action','entity_type','entity_id','request_id','metadata'];
  const body=[header.join(','),...rows.map(row=>header.map(key=>csv((row as Record<string,unknown>)[key])).join(','))].join('\n');
  await recordAdminAction({adminUserId:access.user.id,adminRole:access.role,action:'audit_log_exported',entityType:'audit_log',metadata:{row_count:rows.length,limit}});
  return new Response(`\uFEFF${body}`,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="hyrbart-audit-${new Date().toISOString().slice(0,10)}.csv"`,'cache-control':'private, no-store'}});
}
