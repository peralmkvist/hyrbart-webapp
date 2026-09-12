import { redirect } from 'next/navigation';
import NewListingFlow from '@/components/NewListingFlow';
import { createClient } from '@/lib/supabase/server';

export default async function NewListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/${locale}/vard/annonser/ny`)}`);
  const {data:profile}=await supabase.from('profiles').select('display_name,city,payout_method_ready,sanity_profile_id').eq('id',user.id).maybeSingle();
  if(!profile?.display_name||!profile?.city||!profile?.sanity_profile_id||!profile?.payout_method_ready) redirect(`/${locale}/vard/onboarding`);
  return <NewListingFlow locale={locale} />;
}
