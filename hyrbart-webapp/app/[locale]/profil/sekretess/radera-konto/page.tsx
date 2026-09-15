import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import '../../../profile-menu.css';

const FINAL_BOOKING_STATUSES = new Set(['completed', 'cancelled', 'canceled', 'rejected', 'expired']);
const RECENT_AUTH_MINUTES = 15;

export default async function DeleteAccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/profil/sekretess/radera-konto`)}`);

  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .select('id,status,start_date,end_date')
    .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`);
  if (bookingError) throw bookingError;

  const openBookings = (bookings ?? []).filter(booking => !FINAL_BOOKING_STATUSES.has(String(booking.status ?? '').toLowerCase()));
  const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  const recentAuth = lastSignInAt > 0 && Date.now() - lastSignInAt <= RECENT_AUTH_MINUTES * 60_000;

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader">
      <Link href={`/topsecret/${locale}/profil/sekretess`} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link>
      <h1>{en ? 'Delete account' : 'Ta bort konto'}</h1>
    </header>

    <p className="profileSettingsIntro">
      {en
        ? 'Account deletion is permanent. Hyrbart first checks active rentals and separates data that must be retained for accounting, disputes or other legal obligations.'
        : 'Kontoradering är permanent. Hyrbart kontrollerar först pågående uthyrningar och skiljer ut uppgifter som måste sparas för bokföring, tvister eller andra rättsliga skyldigheter.'}
    </p>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'BEFORE DELETION' : 'FÖRE RADERING'}</span><h2>{en ? 'Account check' : 'Kontroll av kontot'}</h2></div>
      <ul>
        <li>{openBookings.length === 0
          ? (en ? 'No active or unfinished rentals were found.' : 'Inga pågående eller oavslutade uthyrningar hittades.')
          : (en ? `${openBookings.length} active or unfinished rental(s) must be resolved first.` : `${openBookings.length} pågående eller oavslutade uthyrning(ar) måste avslutas först.`)}</li>
        <li>{recentAuth
          ? (en ? 'Your sign-in is recent enough for a sensitive account action.' : 'Din inloggning är tillräckligt aktuell för en känslig kontoåtgärd.')
          : (en ? 'You must sign in again immediately before the final deletion step.' : 'Du måste logga in igen direkt före det slutliga raderingssteget.')}</li>
      </ul>
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'WHAT HAPPENS' : 'VAD SOM HÄNDER'}</span><h2>{en ? 'Deletion and retention' : 'Radering och bevarande'}</h2></div>
      <p>{en
        ? 'Profile information, optional preferences, follows, search alerts and other data that is no longer needed will be deleted or anonymised. Accounting and transaction records that Hyrbart must retain will be separated from normal account use and kept only for the applicable retention period. Open disputes or legal claims can require longer restricted retention.'
        : 'Profiluppgifter, valfria preferenser, följningar, sökbevakningar och andra uppgifter som inte längre behövs raderas eller anonymiseras. Bokförings- och transaktionsunderlag som Hyrbart måste spara avskiljs från vanlig kontoanvändning och bevaras endast under tillämplig lagringstid. Öppna tvister eller rättsliga anspråk kan kräva längre begränsat bevarande.'}</p>
    </section>

    <section className="profileSettingsCard profilePrivacyNotice">
      <strong>{en ? 'Final deletion is not enabled yet' : 'Slutlig radering är ännu inte aktiverad'}</strong>
      <p>{en
        ? 'The destructive step stays disabled until the retention/anonymisation rules and session/storage cleanup are fully verified. This prevents a deletion request from breaking booking or payment records or leaving authenticated access behind.'
        : 'Det destruktiva steget hålls avstängt tills reglerna för bevarande/anonymisering samt sessions- och storage-rensning är fullt verifierade. Det förhindrar att en raderingsbegäran förstör boknings- eller betalningsunderlag eller lämnar autentiserad åtkomst kvar.'}</p>
      <button type="button" className="profilePrimaryAction" disabled aria-disabled="true">{en ? 'Confirm permanent deletion' : 'Bekräfta permanent radering'}</button>
    </section>
  </section>;
}
