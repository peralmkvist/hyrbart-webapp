import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import '../profile-menu.css';

const MAX_BIO_LENGTH = 500;

export default async function AccountSettingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ back?: string; section?: string; saved?: string; error?: string }> }) {
  const { locale } = await params;
  const { back, section, saved, error } = await searchParams;
  const en = locale === 'en';
  const profileSection = section === 'profile';
  const backHref = profileSection
    ? (back === 'vard' ? `/topsecret/${locale}/vard/installningar` : `/topsecret/${locale}/profil/installningar`)
    : (back === 'vard' ? `/topsecret/${locale}/vard/profil` : `/topsecret/${locale}/profil`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/profil/konto`)}`);
  const { data: profile } = await supabase.from('profiles').select('display_name,city,bio,avatar_url').eq('id', user.id).maybeSingle();

  async function saveProfile(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const displayName = String(formData.get('display_name') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const bio = String(formData.get('bio') || '').trim();
    const avatarUrl = String(formData.get('avatar_url') || '').trim();
    const query = new URLSearchParams();
    if (back) query.set('back', back);
    if (section) query.set('section', section);

    if (bio.length > MAX_BIO_LENGTH) {
      query.set('error', 'bio-too-long');
      redirect(`/topsecret/${locale}/profil/konto?${query.toString()}`);
    }

    if (avatarUrl) {
      try {
        const parsed = new URL(avatarUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
      } catch {
        query.set('error', 'invalid-avatar-url');
        redirect(`/topsecret/${locale}/profil/konto?${query.toString()}`);
      }
    }

    const { error: updateError } = await supabase.from('profiles').update({
      display_name: displayName || null,
      city: city || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    if (updateError) {
      query.set('error', 'save-failed');
      redirect(`/topsecret/${locale}/profil/konto?${query.toString()}`);
    }

    revalidatePath(`/topsecret/${locale}/profil`);
    revalidatePath(`/topsecret/${locale}/vard/profil`);
    revalidatePath(`/${locale}/profil/${user.id}`);
    query.set('saved', '1');
    redirect(`/topsecret/${locale}/profil/konto?${query.toString()}`);
  }

  const title = profileSection ? (en ? 'Profile settings' : 'Profilinställningar') : (en ? 'Account settings' : 'Kontoinställningar');
  const errorMessage = error === 'bio-too-long'
    ? (en ? `Your bio can be at most ${MAX_BIO_LENGTH} characters.` : `Din presentation får vara högst ${MAX_BIO_LENGTH} tecken.`)
    : error === 'invalid-avatar-url'
      ? (en ? 'Enter a valid image URL beginning with http:// or https://.' : 'Ange en giltig bildadress som börjar med http:// eller https://.')
      : error === 'save-failed'
        ? (en ? 'The profile could not be saved. Please try again.' : 'Profilen kunde inte sparas. Försök igen.')
        : null;

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={backHref} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{title}</h1></header>
    <p className="profileSettingsIntro">{profileSection ? (en ? 'These profile details are shared between renter and host mode.' : 'De här profiluppgifterna delas mellan hyrar- och uthyrarläget.') : (en ? 'Manage the details connected to your Hyrbart account.' : 'Hantera uppgifterna som hör till ditt Hyrbart-konto.')}</p>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'PROFILE' : 'PROFIL'}</span><h2>{en ? 'Public profile' : 'Offentlig profil'}</h2></div>
      <p>{en ? 'Name, city, photo and bio are shown on your public profile and are shared between renter and host mode.' : 'Namn, ort, profilbild och presentation visas på din offentliga profil och delas mellan hyrar- och uthyrarläget.'}</p>
      {saved === '1' ? <p role="status" className="profileSettingsSuccess">{en ? 'Your changes have been saved.' : 'Dina ändringar har sparats.'}</p> : null}
      {errorMessage ? <p role="alert" className="profileSettingsError">{errorMessage}</p> : null}
      <form action={saveProfile} className="profileSettingsForm">
        <label><span>{en ? 'Name' : 'Namn'}</span><input name="display_name" defaultValue={profile?.display_name || ''} autoComplete="name" /></label>
        <label><span>{en ? 'City' : 'Ort'}</span><input name="city" defaultValue={profile?.city || ''} autoComplete="address-level2" /></label>
        <label><span>{en ? 'Profile photo URL' : 'Profilbildens webbadress'}</span><input name="avatar_url" type="url" inputMode="url" defaultValue={profile?.avatar_url || ''} placeholder="https://…" aria-describedby="avatar-help" /><small id="avatar-help">{en ? 'Use a direct http or https image URL. Leave blank to use your initial.' : 'Använd en direkt http- eller https-adress till bilden. Lämna tomt för att visa din initial.'}</small></label>
        <label><span>{en ? 'About you' : 'Om dig'}</span><textarea name="bio" defaultValue={profile?.bio || ''} maxLength={MAX_BIO_LENGTH} rows={5} aria-describedby="bio-help" /><small id="bio-help">{en ? `A short introduction shown on your public profile. Maximum ${MAX_BIO_LENGTH} characters.` : `En kort presentation som visas på din offentliga profil. Högst ${MAX_BIO_LENGTH} tecken.`}</small></label>
        <label><span>{en ? 'Email' : 'E-post'}</span><input value={user.email || ''} readOnly /></label>
        <button type="submit" className="profilePrimaryAction">{en ? 'Save changes' : 'Spara ändringar'}</button>
      </form>
    </section>

    {!profileSection ? <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'SECURITY' : 'SÄKERHET'}</span><h2>{en ? 'Sign-in and account' : 'Inloggning och konto'}</h2></div>
      <p>{en ? 'Your email address is tied to your sign-in. More security controls can be added here as account management expands.' : 'Din e-postadress är kopplad till inloggningen. Här kan fler säkerhetsinställningar läggas till när kontohanteringen byggs ut.'}</p>
    </section> : null}
  </section>;
}
