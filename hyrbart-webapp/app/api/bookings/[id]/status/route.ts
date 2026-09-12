import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedTransitions: Record<string, string[]> = {
  requested: ['accepted', 'declined'],
  reserved: ['accepted', 'declined'],
  accepted: ['cancelled'],
  returned: ['completed'],
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { status?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }
  const nextStatus = body.status;
  if (!nextStatus) return NextResponse.json({ error: 'Status saknas.' }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

    const { data: booking, error: loadError } = await supabase
      .from('bookings')
      .select('id,owner_id,status')
      .eq('id', id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!booking) return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });
    if (booking.owner_id !== user.id) return NextResponse.json({ error: 'Du får inte hantera den här bokningen.' }, { status: 403 });
    if (!(allowedTransitions[booking.status] ?? []).includes(nextStatus)) {
      return NextResponse.json({ error: 'Den statusändringen är inte tillåten.' }, { status: 409 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({ status: nextStatus })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('id,status')
      .single();
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    console.error('Booking status update failed', error);
    return NextResponse.json({ error: 'Kunde inte uppdatera bokningen.' }, { status: 500 });
  }
}
