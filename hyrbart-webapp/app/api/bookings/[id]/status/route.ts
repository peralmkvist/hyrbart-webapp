import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts } from '@/lib/sanity-products';
import { notifyUser } from '@/lib/notifications';
import { recordBookingEvent } from '@/lib/booking-events';
import { ensureScheduledPayout } from '@/lib/payment-ledger';
import { ensureBookingAgreement } from '@/lib/booking-agreements';
import { canBookingTransition, type BookingActor } from '@/lib/booking-state';
import { correlationIdFromRequest, errorSummary, logOperationalEvent } from '@/lib/observability';
import { hasRequiredProfilePhoto, PROFILE_PHOTO_REQUIRED_CODE } from '@/lib/profile-requirements';

const statusTitle: Record<string, string> = { accepted: 'Bokning godkänd', declined: 'Bokningsförfrågan nekad', completed: 'Bokning avslutad' };
function formatDateRange(from: string, to: string) { const format = (value: string) => new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)); return `${format(from)} – ${format(to)}`; }
function paymentDeadline(pickupAt?: string | null) { const now = Date.now(); const twelveHours = now + 12 * 60 * 60 * 1000; const twoHoursBeforePickup = pickupAt ? new Date(pickupAt).getTime() - 2 * 60 * 60 * 1000 : Number.POSITIVE_INFINITY; const preferred = Math.min(twelveHours, twoHoursBeforePickup); const minimum = now + 30 * 60 * 1000; return new Date(Math.max(minimum, preferred)).toISOString(); }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = correlationIdFromRequest(request);
  const { id } = await params;
  let body: { status?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }
  const requestedStatus = body.status;
  if (!requestedStatus) return NextResponse.json({ error: 'Status saknas.' }, { status: 400 });
  if (requestedStatus === 'cancelled' || requestedStatus === 'refunded') return NextResponse.json({ error: 'Avbokningar måste gå genom avbokningsflödet.', code: 'USE_CANCELLATION_FLOW' }, { status: 409 });

  try {
    const supabase = await createClient(); const admin = createAdminClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });
    const { data: booking, error: loadError } = await admin.from('bookings').select('id,owner_id,renter_id,product_id,start_date,end_date,status,currency,rental_price,service_fee,total_price,rental_start_at,pickup_due_at').eq('id', id).maybeSingle();
    if (loadError) throw loadError; if (!booking) return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });
    const isOwner = booking.owner_id === user.id; const isRenter = booking.renter_id === user.id;
    if (!isOwner && !isRenter) return NextResponse.json({ error: 'Du får inte hantera den här bokningen.' }, { status: 403 });
    const actor: BookingActor = isOwner ? 'owner' : 'renter';
    if (!canBookingTransition(booking.status, requestedStatus, actor)) return NextResponse.json({ error: 'Den statusändringen är inte tillåten.' }, { status: 409 });
    if (!isOwner || !['accepted', 'declined', 'completed'].includes(requestedStatus)) return NextResponse.json({ error: 'Använd det specifika flödet för den här statusändringen.' }, { status: 409 });
    if (requestedStatus === 'accepted') {
      const { data: profile } = await admin.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
      if (!hasRequiredProfilePhoto(profile?.avatar_url)) return NextResponse.json({ error: 'Lägg till en profilbild innan du kan godkänna nya bokningar.', code: PROFILE_PHOTO_REQUIRED_CODE }, { status: 409 });
    }

    const previousStatus = booking.status; const now = new Date().toISOString(); const updates: Record<string, unknown> = { status: requestedStatus, updated_at: now };
    if (requestedStatus === 'accepted') { updates.payment_due_at = paymentDeadline(booking.pickup_due_at || booking.rental_start_at); updates.request_expires_at = null; updates.reservation_expires_at = null; }
    if (requestedStatus === 'completed') { updates.auto_complete_at = null; updates.completed_at = now; }
    const { data: updated, error: updateError } = await admin.from('bookings').update(updates).eq('id', id).eq('status', previousStatus).select('id,status,payment_due_at,completed_at').single();
    if (updateError) throw updateError;
    await recordBookingEvent({ bookingId: id, actorId: user.id, eventType: 'booking_status_changed', metadata: { previous_status: previousStatus, new_status: updated.status, actor_role: actor, payment_due_at: updated.payment_due_at || null, completed_at: updated.completed_at || null, correlation_id: correlationId } });
    if (updated.status === 'completed') {
      const payout = await ensureScheduledPayout(booking);
      await recordBookingEvent({ bookingId: id, actorId: user.id, eventType: 'payout_scheduled', metadata: { payout_id: payout.id, amount: payout.amount, currency: payout.currency, provider: payout.provider, simulated: payout.provider === 'simulation', correlation_id: correlationId } });
      try { await ensureBookingAgreement(id); } catch (agreementError) {
        await logOperationalEvent({ correlationId, severity:'error', eventType:'booking_agreement_generation_failed', source:'api.booking.status', route:'/api/bookings/[id]/status', entityType:'booking', entityId:id, message:'Could not generate booking agreement after completion', metadata:{ error:errorSummary(agreementError) } });
      }
    }

    const recipientId = isOwner ? booking.renter_id : booking.owner_id;
    if (recipientId) { const products = await getProducts(); const product = products.find(item => item.id === booking.product_id); const productName = product ? [product.brand, product.name].filter(Boolean).join(' ') : 'Produkt'; await notifyUser({ userId:recipientId, bookingId:id, type:`booking_${updated.status}`, title:statusTitle[updated.status] || 'Bokning uppdaterad', body:`${productName}\n${formatDateRange(booking.start_date, booking.end_date)}`, url:`/topsecret/sv/bokningar/${id}`, eventKey:`booking-status:${id}:${updated.status}` }); }
    await logOperationalEvent({ correlationId, severity:'info', eventType:'booking_status_changed', source:'api.booking.status', route:'/api/bookings/[id]/status', entityType:'booking', entityId:id, message:'Booking status changed', metadata:{ previous_status:previousStatus, new_status:updated.status, actor_role:actor }, persist:false });
    return NextResponse.json({ ok: true, status: updated.status, paymentDueAt: updated.payment_due_at || null, completedAt: updated.completed_at || null });
  } catch (error) {
    await logOperationalEvent({ correlationId, severity:'error', eventType:'booking_status_update_failed', source:'api.booking.status', route:'/api/bookings/[id]/status', entityType:'booking', entityId:id, message:'Booking status update failed', metadata:{ requested_status:requestedStatus, error:errorSummary(error) } });
    return NextResponse.json({ error: 'Kunde inte uppdatera bokningen.', correlationId }, { status: 500 });
  }
}
