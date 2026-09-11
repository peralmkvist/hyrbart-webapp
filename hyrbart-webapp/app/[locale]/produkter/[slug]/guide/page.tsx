import { notFound } from 'next/navigation';
import GuideTabs from '@/components/GuideTabs';
import { InfoIcon } from '@/components/Icons';
import { getProductGuide, type LocalizedGuideText } from '@/lib/sanity-guides';

function text(value: LocalizedGuideText | undefined, en: boolean) {
  if (!value) return '';
  return (en ? value.en : value.sv) || value.sv || value.en || '';
}

const guideSectionLabels = [
  { sv: 'Kom igång', en: 'Get started' },
  { sv: 'Användning', en: 'Use' },
  { sv: 'Tips', en: 'Tips' },
  { sv: 'Återlämning', en: 'Return' },
];

function guideSectionLabel(index: number, en: boolean, fallback: string) {
  const label = guideSectionLabels[index];
  return label ? (en ? label.en : label.sv) : fallback;
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const en = locale === 'en';
  const guide = await getProductGuide(slug);

  if (!guide?.sections?.length) notFound();

  const sections = guide.sections.map((section, index) => ({
    id: section.key,
    label: guideSectionLabel(index, en, text(section.title, en)),
  }));

  return (
    <div className="guidePage pageShell">
      <div className="guideHeaderSticky">
        <div className="guideCategoryRow">{en ? 'User guide' : 'Användarguide'}</div>

        <header className="guideIdentityRow">
          <h1>
            <span>{guide.brand.toUpperCase()}</span>
            <span>{guide.name.toUpperCase()}</span>
          </h1>
        </header>

        <GuideTabs
          sections={sections}
          ariaLabel={en ? 'Guide sections' : 'Guideavsnitt'}
        />
      </div>

      {guide.sections.map((section, index) => {
        const title = guideSectionLabel(index, en, text(section.title, en));
        const intro = text(section.intro, en);

        return (
          <section id={section.key} className="guideSection" key={section.key}>
            <div className="stepHeading">
              <span>{section.stepNumber ?? index + 1}</span>
              {index === 0 ? <h1>{title}</h1> : <h2>{title}</h2>}
            </div>

            {intro && <p>{intro}</p>}

            {section.cards?.map((card, cardIndex) => {
              const cardTitle = text(card.title, en);
              const cardBody = text(card.body, en);
              if (!cardTitle && !cardBody) return null;

              return (
                <div className="guideTextCard" key={`${section.key}-${cardIndex}`}>
                  {cardTitle && <strong>{cardTitle}</strong>}
                  {cardBody && <p>{cardBody}</p>}
                </div>
              );
            })}

            {section.infoBox && (text(section.infoBox.title, en) || text(section.infoBox.body, en)) && (
              <div className="infoBox">
                <InfoIcon />
                <div>
                  {text(section.infoBox.title, en) && <b>{text(section.infoBox.title, en)}</b>}
                  {text(section.infoBox.body, en) && <p>{text(section.infoBox.body, en)}</p>}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
