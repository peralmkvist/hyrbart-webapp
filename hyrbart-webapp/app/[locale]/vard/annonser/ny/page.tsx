import { redirect } from 'next/navigation';
import NewListingFlow from '@/components/NewListingFlow';
import { createClient } from '@/lib/supabase/server';
import { hasRequiredProfilePhoto } from '@/lib/profile-requirements';

export default async function NewListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/${locale}/vard/annonser/ny`)}`);
  const {data:profile}=await supabase.from('profiles').select('display_name,city,payout_method_ready,payout_provider_account_id,bankid_verified,sanity_profile_id,avatar_url').eq('id',user.id).maybeSingle();
  if(!profile?.display_name||!profile?.city||!profile?.sanity_profile_id) redirect(`/${locale}/vard/onboarding`);
  if(!hasRequiredProfilePhoto(profile.avatar_url)) redirect(`/topsecret/${locale}/profil/konto?back=vard&section=profile&required=photo`);
  const publishReady=Boolean(profile.payout_method_ready&&profile.payout_provider_account_id&&profile.bankid_verified);
  return <NewListingFlow locale={locale} payoutReady={publishReady} />;
}
