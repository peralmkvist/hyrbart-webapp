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
    <section className={`productDiscounts128${compact ? ' compact' : ''}`} aria-label={en ? 'Available discounts' : 'Tillgängliga rabatter'}>
      <div className="productDiscounts128Heading">
        <span aria-hidden="true">%</span>
        <strong>{en ? 'Available discounts' : 'Tillgängliga rabatter'}</strong>
      </div>
      <div className="productDiscounts128List">
        {items.map(item => (
          <div key={item.key} className="productDiscount128">
            <strong>{item.title}</strong>
            {!compact ? <span>{item.condition}</span> : null}
          </div>
        ))}
      </div>
      <style jsx>{`
        .productDiscounts128 { margin:18px 0 0; padding:16px; border:1px solid var(--line); border-radius:18px; background:#fff; }
        .productDiscounts128Heading { display:flex; align-items:center; gap:9px; margin-bottom:11px; }
        .productDiscounts128Heading > span { display:grid; place-items:center; width:30px; height:30px; border-radius:50%; background:var(--accent); color:#111; font-weight:900; }
        .productDiscounts128Heading strong { font-size:1rem; }
        .productDiscounts128List { display:grid; gap:9px; }
        .productDiscount128 { display:grid; gap:2px; }
        .productDiscount128 strong { font-size:.94rem; }
        .productDiscount128 span { color:var(--muted); font-size:.86rem; line-height:1.35; }
        .productDiscounts128.compact { padding:10px 12px; border-radius:14px; }
        .productDiscounts128.compact .productDiscounts128Heading { margin-bottom:7px; }
        .productDiscounts128.compact .productDiscounts128Heading > span { width:25px; height:25px; font-size:.8rem; }
      `}</style>
    </section>
  );
}
