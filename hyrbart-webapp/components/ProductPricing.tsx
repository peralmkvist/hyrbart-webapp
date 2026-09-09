import type { ProductBadge, RentalPrice } from '@/lib/products';

export function ProductBadgeLabel({
  badge,
  locale = 'sv',
  large = false,
}: {
  badge?: ProductBadge;
  locale?: string;
  large?: boolean;
}) {
  if (!badge) return null;
  const en = locale === 'en';
  const label = badge === 'very-popular'
    ? (en ? 'VERY POPULAR' : 'JÄTTEPOPULÄR')
    : (en ? 'POPULAR' : 'POPULÄR');

  return (
    <span
      className="productPopularityBadge"
      style={{
        maxWidth: '60%',
        fontSize: large ? undefined : 'clamp(.42rem, 1.55vw, .66rem)',
        padding: large ? undefined : '5px 6px',
        minHeight: large ? undefined : '26px',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {label}
    </span>
  );
}

export function RentalPriceGrid({ prices, locale = 'sv', compact = false }: {
  prices?: RentalPrice[];
  locale?: string;
  compact?: boolean;
}) {
  if (!prices?.length) return null;
  const en = locale === 'en';
  return (
    <div className={`rentalPriceGrid ${compact ? 'compact' : ''}`}>
      {prices.map(({ days, price }) => (
        <div className="rentalPriceBox" key={days}>
          <strong>{price} kr</strong>
          <span>{days} {en ? (days === 1 ? 'day' : 'days') : (days === 1 ? 'dag' : 'dagar')}</span>
        </div>
      ))}
    </div>
  );
}
