import styles from './page.module.css';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === 'en';

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.content}>
        <div className={styles.copy}>
          <h1>{en ? 'Welcome' : 'Välkommen hit'}</h1>

          <p>
            {en
              ? 'I enjoy home projects and well-made, durable products – and the idea that things I don’t use every day can be useful to someone else. That way, good equipment doesn’t just gather dust, while others don’t have to buy machines and products they only use occasionally.'
              : 'Jag gillar hemmaprojekt och bra, hållbara prylar – och tanken på att saker jag inte använder varje dag kan komma till nytta hos någon annan. Då slipper bra saker samla damm, samtidigt som andra inte behöver köpa maskiner och prylar som bara används någon gång ibland.'}
          </p>

          <p>
            {en
              ? 'When you rent from me, it should be easy to get started. What you need is included or available to buy directly from me, so you don’t need an extra trip to the hardware store.'
              : 'När du hyr av mig ska det vara enkelt att komma igång. Det du behöver finns med eller går att köpa till direkt av mig, så att du slipper en extra tur till byggvaruhuset.'}
          </p>

          <p>
            {en
              ? 'Here you’ll find everything I rent out together with my own user guides, so you can quickly understand how it all works. I use the products myself regularly and reinvest the rental income in new products.'
              : 'Här hittar du alla produkter jag hyr ut tillsammans med mina egna användarguider, så att du snabbt förstår hur allt fungerar. Jag använder själv produkterna regelbundet och återinvesterar intäkterna från uthyrningen i nya produkter.'}
          </p>
        </div>
      </section>
    </div>
  );
}
