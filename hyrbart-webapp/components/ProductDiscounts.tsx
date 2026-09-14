import type { CSSProperties } from 'react';
import type { RentalPrice } from '@/lib/products';
import type { RentalDiscountRules } from '@/lib/rental-pricing';

type Props = {
  locale?: string;
  discounts?: RentalDiscountRules;
  rentalPrices?: RentalPrice[];
  compact?: boolean;
};

type DiscountItem = {
  key: string;
  title: string;
  condition: string;
};

function positivePercent(value?: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.min(90, Math.round(Number(value))) : 0;
}

const styles: Record<string, CSSProperties> = {
  section: { margin: '18px 0 0', padding: 16, border: '1px solid var(--line)', borderRadius: 18, background: '#fff' },
  compactSection: { padding: '10px 12px', borderRadius: 14 },
  heading: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 },
  compactHeading: { marginBottom: 7 },
  badge: { display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#111', fontWeight: 900 },
  compactBadge: { width: 25, height: 25, fontSize: '.8rem' },
  headingText: { fontSize: '1rem' },
  list: { display: 'grid', gap: 9 },
  item: { display: 'grid', gap: 2 },
  title: { fontSize: '.94rem' },
  condition: { color: 'var(--muted)', fontSize: '.86rem', lineHeight: 1.35 },
};

export default function ProductDiscounts({ locale = 'sv', discounts, rentalPrices, compact = false }: Props) {
  const en = locale === 'en';
  const items: DiscountItem[] = [];
  const multi = positivePercent(discounts?.multiDayPercent);
  const weekly = positivePercent(discounts?.weeklyPercent);
  const repeat = positivePercent(discounts?.repeatCustomerPercent);

  if (multi) {
    items.push({
      key: 'multi',
      title: en ? `${multi}% multi-day discount` : `${multi} % flerdagsrabatt`,
      condition: en ? 'Applies to rentals of 2–6 days.' : 'Gäller vid hyra i 2–6 dagar.',
    });
  }

  if (weekly) {
    items.push({
      key: 'weekly',
      title: en ? `${weekly}% weekly discount` : `${weekly} % veckorabatt`,
      condition: en ? 'Applies to rentals of 7 days or more.' : 'Gäller vid hyra i 7 dagar eller längre.',
    });
  }

  if (repeat) {
    items.push({
      key: 'repeat',
      title: en ? `${repeat}% returning-customer discount` : `${repeat} % stammisrabatt`,
      condition: en ? 'Applies when the booking qualifies as a returning-customer rental.' : 'Gäller när bokningen kvalificerar som återkommande kund.',
    });
  }

  const tierSavings = (rentalPrices ?? [])
    .filter(tier => tier.days > 1 && tier.price > 0)
    .sort((a, b) => a.days - b.days);

  for (const tier of tierSavings) {
    items.push({
      key: `tier-${tier.days}`,
      title: en ? `${tier.days}-day package: SEK ${tier.price}` : `${tier.days}-dagarspaket: ${tier.price} kr`,
      condition: en ? 'Package price is used by the same pricing engine at checkout when it gives the best price.' : 'Paketpriset används av samma prismotor i checkout när det ger lägst pris.',
    });
  }

  if (!items.length) return null;

  return (
    <section style={{ ...styles.section, ...(compact ? styles.compactSection : {}) }} aria-label={en ? 'Available discounts' : 'Tillgängliga rabatter'}>
      <div style={{ ...styles.heading, ...(compact ? styles.compactHeading : {}) }}>
        <span aria-hidden="true" style={{ ...styles.badge, ...(compact ? styles.compactBadge : {}) }}>%</span>
        <strong style={styles.headingText}>{en ? 'Available discounts' : 'Tillgängliga rabatter'}</strong>
      </div>
      <div style={styles.list}>
        {items.map(item => (
          <div key={item.key} style={styles.item}>
            <strong style={styles.title}>{item.title}</strong>
            {!compact ? <span style={styles.condition}>{item.condition}</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
