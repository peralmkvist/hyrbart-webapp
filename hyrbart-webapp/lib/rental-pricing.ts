export const BOOKING_FEE = 9;

export type RentalPriceTier = { days: number; price: number };
export type RentalDiscountRules = {
  multiDayPercent?: number;
  weeklyPercent?: number;
  repeatCustomerPercent?: number;
};

export type RentalPricing = {
  days: number;
  dailyPrice: number;
  regularRental: number;
  rentalCost: number;
  discount: number;
  discountPercent: number;
  discountType?: 'multiDay' | 'weekly' | 'repeatCustomer';
  hasWeeklyDiscount: boolean;
  bookingFee: number;
  total: number;
};

export function dailyNumber(price: string): number | null {
  const match = price.match(/([0-9]+(?:[.,][0-9]+)?)/);
  return match ? Number(match[1].replace(',', '.')) : null;
}

export function rentalDays(from?: string, to?: string): number | null {
  if (!from) return null;
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to || from}T12:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function bestRentalCost(days: number, daily: number, prices?: RentalPriceTier[]): number {
  const tiers = [
    { days: 1, price: daily },
    ...(prices ?? []).filter((tier) => tier.days > 1 && tier.price > 0),
  ];

  const dp = Array(days + 1).fill(Number.POSITIVE_INFINITY);
  dp[0] = 0;

  for (let currentDay = 1; currentDay <= days; currentDay += 1) {
    for (const tier of tiers) {
      if (tier.days <= currentDay) {
        dp[currentDay] = Math.min(dp[currentDay], dp[currentDay - tier.days] + tier.price);
      }
    }
  }

  return Number.isFinite(dp[days]) ? Math.round(dp[days]) : Math.round(days * daily);
}

function clampPercent(value?: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(90, Number(value)));
}

export function calculateRentalPricing(
  priceLabel: string,
  from?: string,
  to?: string,
  prices?: RentalPriceTier[],
  discountRules?: RentalDiscountRules,
  repeatCustomer = false,
): RentalPricing | null {
  const days = rentalDays(from, to);
  const dailyPrice = dailyNumber(priceLabel);
  if (!days || !dailyPrice) return null;

  const regularRental = Math.round(days * dailyPrice);

  const multiDayPercent = days >= 2 && days <= 6 ? clampPercent(discountRules?.multiDayPercent) : 0;
  const weeklyPercent = days >= 7 ? clampPercent(discountRules?.weeklyPercent) : 0;
  const repeatPercent = repeatCustomer ? clampPercent(discountRules?.repeatCustomerPercent) : 0;
  const configuredPercent = Math.max(multiDayPercent, weeklyPercent, repeatPercent);

  let rentalCost: number;
  let discountType: RentalPricing['discountType'];
  if (configuredPercent > 0) {
    rentalCost = Math.round(regularRental * (1 - configuredPercent / 100));
    discountType = configuredPercent === repeatPercent && repeatPercent > Math.max(multiDayPercent, weeklyPercent)
      ? 'repeatCustomer'
      : weeklyPercent >= multiDayPercent && weeklyPercent > 0
        ? 'weekly'
        : 'multiDay';
  } else {
    rentalCost = bestRentalCost(days, dailyPrice, prices);
    if (rentalCost < regularRental) discountType = days >= 7 ? 'weekly' : 'multiDay';
  }

  const discount = Math.max(0, regularRental - rentalCost);
  const discountPercent = discount > 0 ? Math.round((discount / regularRental) * 100) : 0;
  const hasWeeklyDiscount = discountType === 'weekly';

  return {
    days,
    dailyPrice,
    regularRental,
    rentalCost,
    discount,
    discountPercent,
    discountType,
    hasWeeklyDiscount,
    bookingFee: BOOKING_FEE,
    total: rentalCost + BOOKING_FEE,
  };
}
