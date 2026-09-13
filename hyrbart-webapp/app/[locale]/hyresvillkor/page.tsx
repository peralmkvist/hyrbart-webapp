import { RENTAL_TERMS_VERSION } from '@/lib/legal';

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const headingStyle = { maxWidth: 'calc(100% - 56px)', fontSize: 'clamp(2rem, 7vw, 3.8rem)' } as const;

  if (en) {
    return <div className="pageShell termsPage">
      <header className="pageHeader termsHeaderSticky">
        <h1 style={headingStyle}>RENTAL TERMS</h1>
        <p>Terms for bookings made through Hyrbart.</p>
        <small>Version {RENTAL_TERMS_VERSION}</small>
      </header>

      <section className="termsCard"><h2>Booking and price</h2><p>The price, dates, cancellation policy and other booking details shown when the request is submitted are saved with the booking. A booking is not ready for pickup until it has been accepted and paid.</p></section>
      <section className="termsCard"><h2>Pickup and return</h2><p>The renter and owner are responsible for agreeing practical handover details within the booked period. The item must be documented at pickup and return using Hyrbart's condition flow when that flow is available for the booking.</p><p>Any visible deviation should be documented immediately. The documentation is used as evidence if the parties later disagree about condition or damage.</p></section>
      <section className="termsCard"><h2>Use and responsibility</h2><p>The renter must handle the item with reasonable care and use it according to instructions and its intended purpose. The item should be returned in substantially the same condition as at pickup, except for normal wear.</p><p>Damage, loss, abnormal wear or misuse may lead to a claim. Any compensation is assessed from the circumstances, available evidence and the applicable booking terms.</p></section>
      <section className="termsCard"><h2>Cancellation and refunds</h2><p>The cancellation policy saved with the booking determines the calculated refund when the renter cancels. If the owner cancels, the renter should not bear the rental cost. The exact refund is shown in the cancellation flow before confirmation.</p></section>
      <section className="termsCard"><h2>Protection and insurance</h2><p>Do not assume that a booking is insured unless Hyrbart explicitly states that a specific protection or insurance applies to that booking. If protection is introduced, its coverage, exclusions and any deductible will be shown separately.</p></section>
      <section className="termsCard"><h2>Disputes</h2><p>Either party can open a case connected to the booking and attach relevant evidence. Hyrbart may review booking history, messages, condition documentation and other submitted evidence when assisting with a dispute.</p></section>
    </div>;
  }

  return <div className="pageShell termsPage">
    <header className="pageHeader termsHeaderSticky">
      <h1 style={headingStyle}>HYRESVILLKOR</h1>
      <p>Villkor för bokningar som görs via Hyrbart.</p>
      <small>Version {RENTAL_TERMS_VERSION}</small>
    </header>

    <section className="termsCard"><h2>Bokning och pris</h2><p>Pris, datum, avbokningspolicy och övriga bokningsuppgifter som visas när förfrågan skickas sparas tillsammans med bokningen. En bokning är inte redo för utlämning förrän den har godkänts och betalats.</p></section>
    <section className="termsCard"><h2>Utlämning och återlämning</h2><p>Hyrestagare och uthyrare ansvarar för att komma överens om praktiska detaljer för överlämningen inom den bokade perioden. Produkten ska dokumenteras vid utlämning och återlämning genom Hyrbarts skickflöde när det finns tillgängligt för bokningen.</p><p>Synliga avvikelser bör dokumenteras direkt. Dokumentationen används som underlag om parterna senare är oense om skick eller skada.</p></section>
    <section className="termsCard"><h2>Användning och ansvar</h2><p>Hyrestagaren ska hantera produkten varsamt och använda den enligt instruktion och avsett ändamål. Produkten ska återlämnas i väsentligen samma skick som vid utlämningen, med undantag för normalt slitage.</p><p>Skada, förlust, onormalt slitage eller felanvändning kan leda till ett ersättningskrav. Eventuell ersättning bedöms utifrån omständigheterna, tillgängligt underlag och de villkor som gäller för bokningen.</p></section>
    <section className="termsCard"><h2>Avbokning och återbetalning</h2><p>Den avbokningspolicy som sparats med bokningen styr den beräknade återbetalningen när hyrestagaren avbokar. Om uthyraren avbokar ska hyrestagaren inte bära hyreskostnaden. Exakt återbetalning visas i avbokningsflödet före bekräftelse.</p></section>
    <section className="termsCard"><h2>Skydd och försäkring</h2><p>Utgå inte från att en bokning är försäkrad om Hyrbart inte uttryckligen anger att ett visst skydd eller en viss försäkring gäller för just den bokningen. Om ett sådant skydd införs kommer omfattning, undantag och eventuell självrisk att visas separat.</p></section>
    <section className="termsCard"><h2>Tvist och skadeärende</h2><p>Båda parter kan öppna ett ärende kopplat till bokningen och bifoga relevant underlag. Hyrbart kan vid handläggning använda bokningshistorik, meddelanden, skickdokumentation och annat material som parterna lämnat in.</p></section>
  </div>;
}
