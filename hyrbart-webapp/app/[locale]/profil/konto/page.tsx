import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import '../profile-menu.css';

export default async function AccountSettingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ back?: string }> }) {
  const { locale } = await params;
  const { back } = await searchParams;
  const en = locale === 'en';
  const backHref = back === 'vard' ? `/topsecret/${locale}/vard/profil` : `/topsecret/${locale}/profil`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/profil/konto`)}`);
  const { data: profile } = await supabase.from('profiles').select('display_name,city').eq('id', user.id).maybeSingle();

  async function saveProfile(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const displayName = String(formData.get('display_name') || '').trim();
    const city = String(formData.get('city') || '').trim();
    await supabase.from('profiles').update({ display_name: displayName || null, city: city || null }).eq('id', user.id);
    revalidatePath(`/topsecret/${locale}/profil`);
    revalidatePath(`/topsecret/${locale}/vard/profil`);
  }

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={backHref} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Account settings' : 'Kontoinställningar'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'Manage the details connected to your Hyrbart account.' : 'Hantera uppgifterna som hör till ditt Hyrbart-konto.'}</p>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'PROFILE' : 'PROFIL'}</span><h2>{en ? 'Personal details' : 'Personliga uppgifter'}</h2></div>
      <form action={saveProfile} className="profileSettingsForm">
        <label><span>{en ? 'Name' : 'Namn'}</span><input name="display_name" defaultValue={profile?.display_name || ''} autoComplete="name" /></label>
        <label><span>{en ? 'City' : 'Ort'}</span><input name="city" defaultValue={profile?.city || ''} autoComplete="address-level2" /></label>
        <label><span>{en ? 'Email' : 'E-post'}</span><input value={user.email || ''} readOnly /></label>
        <button type="submit" className="profilePrimaryAction">{en ? 'Save changes' : 'Spara ändringar'}</button>
      </form>
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'SECURITY' : 'SÄKERHET'}</span><h2>{en ? 'Sign-in and account' : 'Inloggning och konto'}</h2></div>
      <p>{en ? 'Your email address is tied to your sign-in. More security controls can be added here as account management expands.' : 'Din e-postadress är kopplad till inloggningen. Här kan fler säkerhetsinställningar läggas till när kontohanteringen byggs ut.'}</p>
    </section>
  </section>;
}
