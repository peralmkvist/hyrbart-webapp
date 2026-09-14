import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['paid', 'active', 'returned', 'completed'];

function parseMonth(value: string | null) {
  const match = /^([0-9]{4})-([0-9]{2})$/.exec(value || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2020 || year > 2100 || month < 1 || month > 12) return null;
  const first = `${match[1]}-${match[2]}-01`;
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = `${match[1]}-${match[2]}-${String(lastDate).padStart(2, '0')}`;
  return { first, last, key: `${match[1]}-${match[2]}` };
}

async function loadMonth(month: string, userId: string) {
  const parsed = parseMonth(month);
  if (!parsed) return { error: 'Ogiltig månad.' } as const;

  const supabase = await createClient();
  const [{ data: goal, error: goalError }, { data: bookings, error: bookingsError }] = await Promise.all([
    supabase.from('host_revenue_goals').select('target_amount').eq('user_id', userId).eq('month', parsed.first).maybeSingle(),
    supabase.from('bookings').select('rental_price,start_date,status').eq('owner_id', userId).gte('start_date', parsed.first).lte('start_date', parsed.last).in('status', STATUSES),
  ]);
  if (goalError) throw goalError;
  if (bookingsError) throw bookingsError;

  const revenue = (bookings || []).reduce((sum, row) => sum + Number(row.rental_price || 0), 0);
  const target = goal?.target_amount ? Number(goal.target_amount) : null;
  const percent = target ? Math.round((revenue / target) * 100) : null;
  const difference = target == null ? null : revenue - target;

  return {
    month: parsed.key,
    revenue,
    target,
    percent,
    difference,
    metric: 'gross_rental_price',
    countedStatuses: STATUSES,
  } as const;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const result = await loadMonth(month || '', user.id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Revenue goal load failed', error);
    return NextResponse.json({ error: 'Kunde inte läsa intäktsmålet just nu.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

    const body = await request.json() as { month?: string; targetAmount?: number | null };
    const parsed = parseMonth(String(body.month || ''));
    if (!parsed) return NextResponse.json({ error: 'Ogiltig månad.' }, { status: 400 });

    if (body.targetAmount == null || Number(body.targetAmount) === 0) {
      const { error } = await supabase.from('host_revenue_goals').delete().eq('user_id', user.id).eq('month', parsed.first);
      if (error) throw error;
    } else {
      const targetAmount = Math.round(Number(body.targetAmount));
      if (!Number.isFinite(targetAmount) || targetAmount < 1 || targetAmount > 10000000) {
        return NextResponse.json({ error: 'Målet måste vara mellan 1 och 10 000 000 kr.' }, { status: 400 });
      }
      const { error } = await supabase.from('host_revenue_goals').upsert({
        user_id: user.id,
        month: parsed.first,
        target_amount: targetAmount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,month' });
      if (error) throw error;
    }

    const result = await loadMonth(parsed.key, user.id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Revenue goal save failed', error);
    return NextResponse.json({ error: 'Det gick inte att spara intäktsmålet just nu.' }, { status: 500 });
  }
}
