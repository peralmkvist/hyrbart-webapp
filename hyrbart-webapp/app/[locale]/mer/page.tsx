import { ForwardIcon } from '@/components/Icons';

type MoreItem = {
  label: string;
  body: React.ReactNode;
};

export default async function MorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';

  const items: MoreItem[] = en
    ? [
        {
          label: 'About Hyrbart',
          body: <p>Hyrbart gathers rental products, product information and practical user guides in one place.</p>,
        },
        {
          label: 'How it works',
          body: <p>Find the product you need, read the product information and guide, then use the Hygglo button on the product page to make your booking.</p>,
        },
        {
          label: 'Terms',
          body: <>
            <h3>Pickup and return</h3>
            <p>Daily rental applies, with return on the final booked rental day, unless otherwise agreed. Pickup may take place the day before between 18:00–21:00 if the rental item is available. On public holidays, pickup takes place between 08:00–10:00, or as otherwise agreed. Return is possible until 21:00.</p>
            <h3>Use and responsibility</h3>
            <p>The renter is responsible for careful handling and for using the equipment according to the instructions and its intended purpose. The equipment must be returned in the same condition as at pickup and cleaned of dirt, dust and material residue.</p>
            <h3>Consumables</h3>
            <p>Consumables such as detergent, saw blades and sandpaper are often included or available to purchase when needed.</p>
          </>,
        },
        {
          label: 'Privacy',
          body: <p>This section is reserved for Hyrbart's privacy information and handling of personal data.</p>,
        },
        {
          label: 'Contact',
          body: <p>Contact information for Hyrbart is shown here when available.</p>,
        },
        {
          label: 'Help & FAQ',
          body: <p>For product-specific help, open the product's user guide. Booking-related questions are handled in connection with the Hygglo booking.</p>,
        },
      ]
    : [
        {
          label: 'Om Hyrbart',
          body: <p>Hyrbart samlar hyrprodukter, produktinformation och praktiska användarguider på ett ställe.</p>,
        },
        {
          label: 'Så funkar det',
          body: <p>Hitta produkten du behöver, läs produktinformationen och guiden och använd sedan Hygglo-knappen på produktsidan för att boka.</p>,
        },
        {
          label: 'Villkor',
          body: <>
            <h3>Hämtning och återlämning</h3>
            <p>Dagshyra gäller med återlämning sista bokade hyresdag om inget annat är överenskommet. Utlämning kan ske dagen innan kl. 18:00–21:00 om hyresobjektet är tillgängligt. På helgdagar sker utlämning mellan kl. 08:00–10:00, eller enligt överenskommelse. Återlämning kan ske fram till kl. 21:00.</p>
            <h3>Användning och ansvar</h3>
            <p>Hyrestagaren ansvarar för varsam hantering och användning enligt instruktion och avsett ändamål. Utrustningen ska återlämnas i samma skick som vid utlämning och rengjord från smuts, damm och materialrester.</p>
            <h3>Förbrukningsmaterial</h3>
            <p>Förbrukningsartiklar som tvättmedel, sågklingor och slippapper ingår ofta eller finns att köpa till vid behov.</p>
          </>,
        },
        {
          label: 'Integritet',
          body: <p>Här samlas Hyrbarts information om integritet och hantering av personuppgifter.</p>,
        },
        {
          label: 'Kontakt',
          body: <p>Kontaktuppgifter för Hyrbart visas här när de finns tillgängliga.</p>,
        },
        {
          label: 'Hjälp & FAQ',
          body: <p>För produktspecifik hjälp, öppna produktens användarguide. Frågor som rör bokningen hanteras i samband med bokningen på Hygglo.</p>,
        },
      ];

  return (
    <section className="ds2Page">
      <header className="ds2Header">
        <h1>{en ? 'More' : 'Mer'}</h1>
      </header>
      <div className="moreAccordion">
        {items.map((item) => (
          <details key={item.label}>
            <summary>
              <span>{item.label}</span>
              <ForwardIcon />
            </summary>
            <div className="moreAccordionBody">{item.body}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
