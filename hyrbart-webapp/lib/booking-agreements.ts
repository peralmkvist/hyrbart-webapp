import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts } from '@/lib/sanity-products';

export const BOOKING_AGREEMENT_VERSION = '1';

export type BookingAgreementSnapshot = {
  agreementVersion: string;
  bookingId: string;
  reference: string;
  generatedAt: string;
  completedAt: string | null;
  bookingCreatedAt: string;
  status: 'completed';
  parties: {
    owner: { id: string; displayName: string | null; city: string | null };
    renter: { id: string; displayName: string | null; city: string | null };
  };
  rental: {
    productId: string;
    productName: string;
    startDate: string;
    endDate: string;
    pickupTime: string | null;
    returnTime: string | null;
    currency: string;
    rentalPrice: number;
    serviceFee: number;
    totalPrice: number;
  };
  terms: {
    cancellationPolicy: string;
    termsVersion: string | null;
    termsAcceptedAt: string | null;
    termsLocale: string | null;
  };
};

function referenceFor(bookingId: string) {
  return `HYR-${bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function hashSnapshot(snapshot: BookingAgreementSnapshot) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

export async function ensureBookingAgreement(bookingId: string) {
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from('booking_agreements')
    .select('booking_id,renter_id,owner_id,reference,agreement_version,snapshot,content_hash,generated_at')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id,renter_id,owner_id,product_id,start_date,end_date,pickup_time,return_time,status,currency,rental_price,service_fee,total_price,created_at,completed_at,cancellation_policy,terms_version,terms_accepted_at,terms_locale')
    .eq('id', bookingId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  if (booking.status !== 'completed') throw new Error('BOOKING_NOT_COMPLETED');

  const [{ data: profiles, error: profilesError }, products] = await Promise.all([
    admin.from('profiles').select('id,display_name,city').in('id', [booking.renter_id, booking.owner_id]),
    getProducts(),
  ]);
  if (profilesError) throw profilesError;
  const owner = (profiles ?? []).find(profile => profile.id === booking.owner_id);
  const renter = (profiles ?? []).find(profile => profile.id === booking.renter_id);
  const product = products.find(item => item.id === booking.product_id);
  const generatedAt = new Date().toISOString();
  const reference = referenceFor(booking.id);

  const snapshot: BookingAgreementSnapshot = {
    agreementVersion: BOOKING_AGREEMENT_VERSION,
    bookingId: booking.id,
    reference,
    generatedAt,
    completedAt: booking.completed_at ?? null,
    bookingCreatedAt: booking.created_at,
    status: 'completed',
    parties: {
      owner: { id: booking.owner_id, displayName: owner?.display_name ?? null, city: owner?.city ?? null },
      renter: { id: booking.renter_id, displayName: renter?.display_name ?? null, city: renter?.city ?? null },
    },
    rental: {
      productId: booking.product_id,
      productName: product ? [product.brand, product.name].filter(Boolean).join(' ') : booking.product_id,
      startDate: booking.start_date,
      endDate: booking.end_date,
      pickupTime: booking.pickup_time ?? null,
      returnTime: booking.return_time ?? null,
      currency: booking.currency || 'SEK',
      rentalPrice: Number(booking.rental_price || 0),
      serviceFee: Number(booking.service_fee || 0),
      totalPrice: Number(booking.total_price || 0),
    },
    terms: {
      cancellationPolicy: booking.cancellation_policy || 'moderate',
      termsVersion: booking.terms_version ?? null,
      termsAcceptedAt: booking.terms_accepted_at ?? null,
      termsLocale: booking.terms_locale ?? null,
    },
  };
  const contentHash = hashSnapshot(snapshot);
  const { data: created, error: insertError } = await admin
    .from('booking_agreements')
    .insert({
      booking_id: booking.id,
      renter_id: booking.renter_id,
      owner_id: booking.owner_id,
      reference,
      agreement_version: BOOKING_AGREEMENT_VERSION,
      snapshot,
      content_hash: contentHash,
      generated_at: generatedAt,
    })
    .select('booking_id,renter_id,owner_id,reference,agreement_version,snapshot,content_hash,generated_at')
    .maybeSingle();

  if (!insertError && created) return created;
  if ((insertError as { code?: string } | null)?.code === '23505') {
    const { data: raced, error: racedError } = await admin
      .from('booking_agreements')
      .select('booking_id,renter_id,owner_id,reference,agreement_version,snapshot,content_hash,generated_at')
      .eq('booking_id', bookingId)
      .single();
    if (racedError) throw racedError;
    return raced;
  }
  throw insertError ?? new Error('AGREEMENT_CREATE_FAILED');
}
