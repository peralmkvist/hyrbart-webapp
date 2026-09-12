import Link from 'next/link';
import ProductSearchForm from '@/components/ProductSearchForm';
import { ArrowIcon, CategoryIcon } from '@/components/Icons';

const popularCategories = [
  { sv: 'Verktyg', en: 'Tools', icon: 'Borra & Skruva' },
  { sv: 'Friluftsliv', en: 'Outdoors', icon: 'Trädgård' },
  { sv: 'Transport', en: 'Transport', icon: 'Biltillbehör' },
  { sv: 'Hem & trädgård', en: 'Home & garden', icon: 'Hem & hushåll' },
  { sv: 'Barnartiklar', en: 'Baby & kids', icon: 'Hem & hushåll' },
  { sv: 'Foto & film', en: 'Photo & film', icon: 'Foto & Teknik' },
  { sv: 'Event', en: 'Events', icon: 'Belysning' },
  { sv: 'Möbler', en: 'Furniture', icon: 'Kontor' },
  { sv: 'Städ & rengöring', en: 'Cleaning', icon: 'Städa & Tvätta' },
  { sv: 'Sport & fritid', en: 'Sports & leisure', icon: 'Mäta' },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';

  return (
    <div className="pageShell rentPage2 homeRentalLanding2 homeLanding3">
      <div className="rentSticky2 homeTop3">
        <header className="brandHeader2" aria-label="Hyrbart">
          <Link href={`/${locale}`} className="hyrbartWordmark2" aria-label="Hyrbart"><span className="hyrbartWordmarkH2">H<i aria-hidden="true" /></span><span>yrbart</span></Link>
        </header>
        <section className="homeIntro2 rentIntro2">
          <h1>{en ? 'What do you want to rent?' : 'Vad vill du hyra?'}</h1>
          <ProductSearchForm locale={locale} initialPlace="" initialRadius="10" initiallyCollapsed={false} />
        </section>
      </div>

      <section className="homeCategorySection3" aria-labelledby="popular-categories-heading">
        <div className="sectionHeading2 homeCategoryHeading3">
          <h2 id="popular-categories-heading">{en ? 'Popular categories' : 'Populära kategorier'}</h2>
          <Link href={`/${locale}/produkter`}>{en ? 'See all' : 'Visa alla'}</Link>
        </div>
        <div className="homeCategoryGrid3">
          {popularCategories.map((item) => {
            const label = en ? item.en : item.sv;
            return (
              <Link key={item.sv} href={`/${locale}/produkter?q=${encodeURIComponent(label)}`} className="homeCategoryChip3">
                <span className="homeCategoryIcon3"><CategoryIcon category={item.icon} /></span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="partnerShowcaseAd" aria-label={en ? 'Advertisement from Byggmax' : 'Annons från Byggmax'}>
        <div className="partnerShowcaseVisual" aria-hidden="true">
          <img src="/byggmax-hyrbart-env.svg" alt="" />
          <div className="partnerShowcaseSlogan">Bygg<br/>det goda<br/>livet<i /></div>
        </div>
        <div className="partnerShowcaseCopy">
          <span className="partnerShowcaseLabel">{en ? 'ADVERTISEMENT' : 'ANNONS'}</span>
          <div className="partnerShowcaseLockup"><strong>Hyrbart</strong><span>×</span><b>BYGGMAX</b></div>
          <h2>{en ? 'Sweden’s things should be used more.' : 'Sveriges prylar ska användas mer.'}</h2>
          <p>{en ? 'Rent what you only need sometimes.' : 'Hyr det du bara behöver ibland.'}<br/><strong>{en ? 'Buy what you need all the time.' : 'Köp det du behöver hela tiden.'}</strong></p>
          <a href="https://www.byggmax.se/" target="_blank" rel="noreferrer sponsored" className="partnerShowcaseButton">{en ? 'Visit Byggmax' : 'Till Byggmax'}<ArrowIcon /></a>
        </div>
      </section>

      <style>{`
        .partnerShowcaseAd{margin:28px 0 8px;border-radius:24px;overflow:hidden;background:#ffd51b;color:#111;box-shadow:0 8px 26px rgba(17,17,17,.08);isolation:isolate}
        .partnerShowcaseVisual{position:relative;height:250px;background:#eee;overflow:hidden}
        .partnerShowcaseVisual img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transform:scale(1.015)}
        .partnerShowcaseVisual:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.08))}
        .partnerShowcaseSlogan{position:absolute;z-index:2;right:20px;top:20px;text-align:center;font-size:27px;font-weight:850;line-height:.9;letter-spacing:-.055em;transform:rotate(-3deg);text-shadow:0 1px 8px rgba(255,255,255,.65)}
        .partnerShowcaseSlogan i{display:block;width:76px;height:6px;margin:8px auto 0;border-radius:999px;background:#ffd51b;transform:rotate(-8deg)}
        .partnerShowcaseCopy{padding:22px 22px 24px;background:linear-gradient(145deg,#ffda1f 0%,#ffd21a 100%)}
        .partnerShowcaseLabel{display:inline-flex;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.58);font-size:10px;font-weight:900;letter-spacing:.08em}
        .partnerShowcaseLockup{display:flex;align-items:baseline;gap:8px;margin-top:12px;font-size:17px;font-weight:800}.partnerShowcaseLockup b{color:#e31d2b;letter-spacing:.015em}.partnerShowcaseLockup span{font-weight:700}
        .partnerShowcaseCopy h2{max-width:310px;margin:12px 0 8px;font-size:36px;line-height:.88;letter-spacing:-.06em;font-weight:900}
        .partnerShowcaseCopy p{margin:0;font-size:15px;line-height:1.35}.partnerShowcaseCopy p strong{font-weight:850}
        .partnerShowcaseButton{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;margin-top:18px;padding:0 18px;border-radius:999px;background:#111;color:#fff;font-size:14px;font-weight:850}.partnerShowcaseButton svg{width:17px;height:17px}
        @media(min-width:600px){.partnerShowcaseAd{display:grid;grid-template-columns:1fr 1fr;min-height:330px}.partnerShowcaseVisual{height:100%;order:2}.partnerShowcaseCopy{display:flex;flex-direction:column;justify-content:center}.partnerShowcaseCopy h2{font-size:38px}}
        @media(max-width:430px){.partnerShowcaseAd{margin-left:0;margin-right:0;border-radius:22px}.partnerShowcaseVisual{height:220px}.partnerShowcaseCopy{padding:20px}.partnerShowcaseCopy h2{font-size:34px}.partnerShowcaseSlogan{right:16px;top:18px;font-size:24px}}
      `}</style>
    </div>
  );
}
