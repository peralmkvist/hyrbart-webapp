import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordBookingEvent } from '@/lib/booking-events';
import { canBookingTransition } from '@/lib/booking-state';
import { notifyUser } from '@/lib/notifications';
import { resolveLateReturn } from '@/lib/late-returns';

const BUCKET = 'booking-condition-photos';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);
const PRIVATE_HEADERS = { 'cache-control': 'private, no-store' };

type Stage = 'pickup'|'return';

function extension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/heic') return 'heic';
  if (file.type === 'image/heif') return 'heif';
  return 'jpg';
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401, headers: PRIVATE_HEADERS });

    const { data: booking } = await supabase.from('bookings').select('id,renter_id,owner_id').eq('id', id).maybeSingle();
    if (!booking || ![booking.renter_id, booking.owner_id].includes(user.id)) {
      return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404, headers: PRIVATE_HEADERS });
    }

    const admin = createAdminClient();
    const { data: photos, error } = await admin
      .from('booking_condition_photos')
      .select('id,stage,storage_path,created_at,uploader_id')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const items = await Promise.all((photos ?? []).map(async photo => {
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(photo.storage_path, 60 * 60);
      return { ...photo, url: data?.signedUrl ?? null };
    }));
    return NextResponse.json({ photos: items }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    console.error('Condition photos GET failed');
    return NextResponse.json({ error: 'Kunde inte läsa skickbilder.' }, { status: 500, headers: PRIVATE_HEADERS });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401, headers: PRIVATE_HEADERS });

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id,renter_id,owner_id,status')
      .eq('id', id)
      .maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking || booking.renter_id !== user.id) {
      return NextResponse.json({ error: 'Endast hyrestagaren kan dokumentera skicket.' }, { status: 403, headers: PRIVATE_HEADERS });
    }

    const form = await request.formData();
    const stage = form.get('stage') as Stage | null;
    const file = form.get('file');
    if (stage !== 'pickup' && stage !== 'return') return NextResponse.json({ error: 'Ogiltigt steg.' }, { status: 400, headers: PRIVATE_HEADERS });
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Minst en bild krävs.' }, { status: 400, headers: PRIVATE_HEADERS });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Bilden måste vara JPEG, PNG, WebP, HEIC eller HEIF.' }, { status: 415, headers: PRIVATE_HEADERS });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Bilden får vara högst 10 MB.' }, { status: 413, headers: PRIVATE_HEADERS });

    const expectedStatus = stage === 'pickup' ? 'paid' : 'active';
    const nextStatus = stage === 'pickup' ? 'active' : 'returned';
    if (booking.status !== expectedStatus || !canBookingTransition(booking.status, nextStatus, 'renter')) {
      return NextResponse.json({ error: stage === 'pickup' ? 'Bokningen måste vara betald innan utlämning.' : 'Bokningen är inte redo för återlämning.' }, { status: 409, headers: PRIVATE_HEADERS });
    }

    const admin = createAdminClient();
    const path = `${id}/${stage}/${crypto.randomUUID()}.${extension(file)}`;
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await admin
      .from('booking_condition_photos')
      .insert({ booking_id: id, stage, uploader_id: user.id, storage_path: path })
      .select('id,stage,created_at')
      .single();
    if (insertError) {
      await admin.storage.from(BUCKET).remove([path]);
      throw insertError;
    }

    const now = new Date();
    const updates: Record<string, unknown> = { status: nextStatus, updated_at: now.toISOString() };
    if (stage === 'return') updates.auto_complete_at = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: transitioned, error: updateError } = await admin
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .eq('status', expectedStatus)
      .select('id,status,auto_complete_at')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!transitioned) {
      await admin.from('booking_condition_photos').delete().eq('id', inserted.id);
      await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: 'Bokningen ändrades samtidigt. Ladda om och försök igen.' }, { status: 409, headers: PRIVATE_HEADERS });
    }

    await recordBookingEvent({
      bookingId: id,
      actorId: user.id,
      eventType: stage === 'pickup' ? 'pickup_documented' : 'return_documented',
      metadata: { photo_id: inserted.id, previous_status: expectedStatus, new_status: nextStatus, stage, auto_complete_at: transitioned.auto_complete_at || null },
    });

    if(stage==='return'){
      try{
        const late=await resolveLateReturn(id,now.toISOString());
        if(late){await recordBookingEvent({bookingId:id,actorId:user.id,eventType:'late_return_resolved',metadata:{returned_at:late.returned_at,overdue_minutes:late.overdue_minutes,estimated_extension_amount:late.estimated_extension_amount,currency:late.currency,fee_status:late.fee_status,calculation_version:late.calculation_version}});}
      }catch{console.error('Could not resolve late return');}
    }

    await notifyUser({
      userId: booking.owner_id,
      bookingId: id,
      type: stage === 'pickup' ? 'pickup_documented' : 'return_documented',
      title: stage === 'pickup' ? 'Uthyrningen har startat' : 'Produkten är återlämnad',
      body: stage === 'pickup' ? 'Hyrestagaren har dokumenterat utlämningen och markerat hyran som pågående.' : 'Hyrestagaren har dokumenterat återlämningen. Kontrollera skicket och avsluta bokningen om allt ser bra ut.',
      url: `/topsecret/sv/bokningar/${id}`,
      eventKey: `handover:${id}:${stage}`,
    });

    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    return NextResponse.json({ ok: true, status: nextStatus, photo: { ...inserted, url: signed?.signedUrl ?? null } }, { headers: PRIVATE_HEADERS });
  } catch {
    console.error('Condition photos POST failed');
    return NextResponse.json({ error: 'Kunde inte spara skickbilden.' }, { status: 500, headers: PRIVATE_HEADERS });
  }
}
