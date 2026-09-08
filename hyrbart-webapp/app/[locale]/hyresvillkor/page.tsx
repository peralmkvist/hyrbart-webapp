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
          <p>Terms for rentals via Hygglo.</p>
        </header>

        <section className="termsCard">
          <h2>Pickup and return</h2>
          <p>
            Daily rental applies, with return on the final booked rental day,
            unless otherwise agreed. Pickup may take place the day before between
            18:00–21:00 if the rental item is available. On public holidays,
            pickup takes place between 08:00–10:00, or as otherwise agreed.
            Return is possible until 21:00.
          </p>
          <p>
            Any pre-existing condition or damage is documented at pickup and
            serves as the reference when the item is returned. Any remarks must
            be raised immediately; otherwise, the equipment is considered to
            have been received without deviations.
          </p>
        </section>

        <section className="termsCard">
          <h2>Use and responsibility</h2>
          <p>
            The renter is responsible for careful handling and for using the
            equipment according to the instructions and its intended purpose.
          </p>
          <p>
            The equipment must be returned in the same condition as at pickup –
            cleaned of dirt, dust and material residue. Otherwise, a cleaning
            charge may apply. Any batteries do not need to be charged.
          </p>
          <p>
            Abnormal wear, damage or misuse, including damage to accessories,
            consumable parts or precision components, during the rental period
            is the responsibility of the renter unless otherwise demonstrated.
          </p>
          <p>
            The renter is responsible for the full cost in the event of damage.
            Compensation corresponds to the cost of repair or an equivalent
            replacement product, after deduction of any insurance compensation
            through Hygglo.
          </p>
        </section>

        <section className="termsCard">
          <h2>Consumables</h2>
          <p>
            Consumables (such as detergent, saw blades, sandpaper, etc.) are
            often included or available to purchase when needed – all to make
            the rental as simple and convenient as possible for you.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="pageShell termsPage">
      <header className="pageHeader termsHeaderSticky">
        <h1>HYRESVILLKOR</h1>
        <p>Villkor för uthyrning via Hygglo.</p>
      </header>

      <section className="termsCard">
        <h2>Hämtning och återlämning</h2>
        <p>
          Dagshyra gäller (återlämning sista bokade hyresdag) om inget annat är
          överenskommet. Utlämning kan ske dagen innan kl. 18:00–21:00 om
          hyresobjektet är tillgängligt. På helgdagar sker utlämning mellan
          kl. 08:00–10:00 (eller enligt överenskommelse). Återlämning kan ske
          fram till kl. 21:00.
        </p>
        <p>
          Avvikande skick dokumenteras vid utlämning och utgör referens för
          bedömning vid återlämning. Anmärkningar ska påtalas direkt, annars
          anses utrustningen mottagen utan avvikelser.
        </p>
      </section>

      <section className="termsCard">
        <h2>Användning och ansvar</h2>
        <p>
          Hyrestagaren ansvarar för varsam hantering och användning enligt
          instruktion och avsett ändamål.
        </p>
        <p>
          Utrustningen ska återlämnas i samma skick som vid utlämning – rengjord
          från smuts, damm och materialrester, annars kan kostnad för rengöring
          tillkomma. Eventuella batterier behöver inte vara laddade.
        </p>
        <p>
          Onormalt slitage, skador eller felanvändning (inkl. skador på tillbehör,
          förbrukningsdelar eller precisionskomponenter) under hyresperioden
          ersätts av hyrestagaren, om inte annat kan styrkas.
        </p>
        <p>
          Hyrestagaren ansvarar för full kostnad vid skada. Ersättning motsvarar
          reparation eller likvärdig ersättningsprodukt, efter avräkning av
          eventuell försäkringsersättning via Hygglo.
        </p>
      </section>

      <section className="termsCard">
        <h2>Förbrukningsmaterial</h2>
        <p>
          Förbrukningsartiklar (t.ex. tvättmedel, sågklingor, slippapper etc.)
          ingår ofta eller finns att köpa till vid behov – allt för att göra det
          så enkelt och smidigt som möjligt för dig som hyr.
        </p>
      </section>
    </div>
  );
}
