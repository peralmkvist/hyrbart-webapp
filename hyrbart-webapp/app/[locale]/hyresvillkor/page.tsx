export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === 'en';

  if (en) {
    return (
      <div className="pageShell termsPage">
        <header className="pageHeader termsHeaderSticky">
          <h1>RENTAL TERMS</h1>
          <p>Terms for rentals via Hyrbart.</p>
        </header>

        <section className="termsCard">
          <h2>Booking and payment</h2>
          <p>
            Booking and payment are handled through Hygglo. Hygglo’s terms apply
            to the booking and payment.
          </p>
        </section>

        <section className="termsCard">
          <h2>Pickup and return</h2>
          <p>
            Equipment must be picked up and returned at the agreed time and
            location. Special instructions may be sent before self-service pickup.
          </p>
        </section>

        <section className="termsCard">
          <h2>Use and responsibility</h2>
          <p>
            Equipment must be used according to the supplied instructions and for
            its intended purpose.
          </p>
        </section>

        <section className="termsCard">
          <h2>Consumables</h2>
          <p>
            Any included consumables and charges for additional use are stated on
            the relevant product page or communicated with the booking.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="pageShell termsPage">
      <header className="pageHeader termsHeaderSticky">
        <h1>HYRESVILLKOR</h1>
        <p>Villkor för uthyrning via Hyrbart.</p>
      </header>

      <section className="termsCard">
        <h2>Bokning och betalning</h2>
        <p>
          Bokning och betalning sker via Hygglo. Hygglos villkor gäller för själva
          bokningen och betalningen.
        </p>
      </section>

      <section className="termsCard">
        <h2>Hämtning och återlämning</h2>
        <p>
          Utrustningen ska hämtas och lämnas tillbaka på avtalad tid och på den
          plats som anges i bokningen.
        </p>
      </section>

      <section className="termsCard">
        <h2>Användning och ansvar</h2>
        <p>
          Utrustningen ska användas enligt medföljande instruktioner och för avsett
          ändamål.
        </p>
      </section>

      <section className="termsCard">
        <h2>Förbrukningsmaterial</h2>
        <p>
          Eventuellt förbrukningsmaterial och kostnad för extra förbrukning framgår
          av respektive produkt eller meddelas i samband med bokningen.
        </p>
      </section>
    </div>
  );
}
