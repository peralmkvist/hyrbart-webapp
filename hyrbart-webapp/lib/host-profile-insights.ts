export const HOST_REVENUE_STATUSES = ['paid', 'active', 'returned', 'completed'] as const;

export type HostBookingMetric = {
  status: string;
  rental_price?: number | null;
  refund_rental_amount?: number | null;
};

export type HostSetupState = {
  identityReady: boolean;
  photoReady: boolean;
  payoutReady: boolean;
  locationReady: boolean;
};

export function calculateEstimatedHostRevenue(rows: HostBookingMetric[]) {
  return rows
    .filter(row => (HOST_REVENUE_STATUSES as readonly string[]).includes(row.status))
    .reduce((sum, row) => sum + Math.max(0, Number(row.rental_price || 0) - Number(row.refund_rental_amount || 0)), 0);
}

export function countCompletedRentals(rows: HostBookingMetric[]) {
  return rows.filter(row => row.status === 'completed').length;
}

export function setupProgress(state: HostSetupState) {
  const completed = Object.values(state).filter(Boolean).length;
  return { completed, total: 4, percent: Math.round((completed / 4) * 100) };
}
