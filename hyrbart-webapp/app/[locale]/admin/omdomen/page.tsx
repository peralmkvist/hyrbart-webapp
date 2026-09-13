import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminReviewModeration from '@/components/AdminReviewModeration';

export default async function AdminReviewsPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const adminUser=await requireAdmin();
  if(!adminUser)redirect(`/${locale}`);
  const admin=createAdminClient();
  const [{data:reviews},{data:reports}]=await Promise.all([
    admin.from('booking_reviews').select('id,booking_id,reviewer_role,overall_rating,comment,submitted_at,moderation_status,moderation_reason').order('submitted_at',{ascending:false}).limit(200),
    admin.from('review_reports').select('id,review_id,reason,details,created_at,status').eq('status','open').order('created_at',{ascending:false}).limit(500),
  ]);
  return <main className="adminPage"><header className="adminHeader"><div><span>HYRBART ADMIN · OMDÖMEN</span><h1>Omdömesmoderering</h1><p>Granska användarrapporter, dölj olämpliga omdömen eller avfärda rapporter utan att radera historiken.</p></div></header><section style={{background:'#fff',border:'1px solid var(--line)',borderRadius:20,padding:'18px 20px',marginTop:24}}><AdminReviewModeration reviews={(reviews||[]) as any} reports={(reports||[]) as any}/></section></main>;
}
