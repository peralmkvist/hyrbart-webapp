export const BOOKING_FEE = 9;

export type RentalPriceTier = { days: number; price: number };

export type RentalPricing = {
  days: number;
  dailyPrice: number;
  regularRental: number;
  rentalCost: number;
  discount: number;
  discountPercent: number;
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

export function calculateRentalPricing(
  priceLabel: string,
  from?: string,
  to?: string,
  prices?: RentalPriceTier[],
): RentalPricing | null {
  const days = rentalDays(from, to);
  const dailyPrice = dailyNumber(priceLabel);
  if (!days || !dailyPrice) return null;

  const regularRental = Math.round(days * dailyPrice);
  const rentalCost = bestRentalCost(days, dailyPrice, prices);
  const discount = Math.max(0, regularRental - rentalCost);
  const discountPercent = discount > 0 ? Math.round((discount / regularRental) * 100) : 0;
  const hasWeeklyDiscount = Boolean(
    days >= 7 && prices?.some((tier) => tier.days >= 7 && tier.price < tier.days * dailyPrice),
  );

  return {
    days,
    dailyPrice,
    regularRental,
    rentalCost,
    discount,
    discountPercent,
    hasWeeklyDiscount,
    bookingFee: BOOKING_FEE,
    total: rentalCost + BOOKING_FEE,
  };
}
