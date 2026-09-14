import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const TRIGGERS = new Set(['booking_requested','booking_accepted','booking_paid','pickup_due','return_due','booking_completed']);

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function loadTemplates(userId: string) {
  const admin = createAdminClient();
  const { data: templates, error } = await admin.from('automated_message_templates')
    .select('id,name,body,trigger_event,offset_minutes,enabled,all_listings,created_at,updated_at')
    .eq('owner_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  const ids = (templates ?? []).map(item => item.id);
  if (!ids.length) return [];
  const [{ data: listings }, { data: assets }] = await Promise.all([
    admin.from('automated_message_template_listings').select('template_id,product_id').eq('owner_id', userId).in('template_id', ids),
    admin.from('automated_message_template_assets').select('id,template_id,storage_path,file_name,content_type,size_bytes,position').eq('owner_id', userId).in('template_id', ids).order('position'),
  ]);
  const assetsWithUrls = await Promise.all((assets ?? []).map(async asset => {
    const { data } = await admin.storage.from('automated-message-assets').createSignedUrl(asset.storage_path, 3600);
    return { ...asset, url: data?.signedUrl ?? null };
  }));
  return (templates ?? []).map(template => ({
    ...template,
    product_ids: (listings ?? []).filter(row => row.template_id === template.id).map(row => row.product_id),
    assets: assetsWithUrls.filter(row => row.template_id === template.id),
  }));
}

function validate(body: any) {
  const name = String(body?.name ?? '').trim();
  const message = String(body?.body ?? '').trim();
  const trigger = String(body?.trigger_event ?? '');
  const offset = Number(body?.offset_minutes ?? 0);
  const allListings = body?.all_listings === true;
  const productIds = Array.isArray(body?.product_ids) ? [...new Set(body.product_ids.map((value: unknown) => String(value)).filter(Boolean))] : [];
  if (!name || name.length > 120) return { error: 'Namnet måste vara 1–120 tecken.' } as const;
  if (!message || message.length > 2000) return { error: 'Meddelandet måste vara 1–2000 tecken.' } as const;
  if (!TRIGGERS.has(trigger)) return { error: 'Ogiltig trigger.' } as const;
  if (!Number.isInteger(offset) || offset < -10080 || offset > 10080) return { error: 'Tidpunkten måste ligga inom sju dagar från triggern.' } as const;
  if (!allListings && productIds.length === 0) return { error: 'Välj minst en annons eller Alla annonser.' } as const;
  if (!['pickup_due','return_due'].includes(trigger) && offset < 0) return { error: 'Endast hämtning och återlämning kan skickas före triggern.' } as const;
  return { name, message, trigger, offset, allListings, productIds, enabled: body?.enabled !== false } as const;
}

export async function GET() {
  try {
    const { user } = await auth();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });
    return NextResponse.json({ messages: await loadTemplates(user.id) });
  } catch (error) {
    console.error('Could not load automated messages', error);
    return NextResponse.json({ error: 'Kunde inte hämta automatiserade meddelanden.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await auth();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });
    const body = await request.json();
    const valid = validate(body);
    if ('error' in valid) return NextResponse.json({ error: valid.error }, { status: 400 });
    const admin = createAdminClient();
    const { data: template, error } = await admin.from('automated_message_templates').insert({
      owner_id: user.id, name: valid.name, body: valid.message, trigger_event: valid.trigger,
      offset_minutes: valid.offset, enabled: valid.enabled, all_listings: valid.allListings,
    }).select('id').single();
    if (error) throw error;
    if (!valid.allListings && valid.productIds.length) {
      const { error: listingError } = await admin.from('automated_message_template_listings').insert(valid.productIds.map(productId => ({ template_id: template.id, owner_id: user.id, product_id: productId })));
      if (listingError) throw listingError;
    }
    return NextResponse.json({ ok: true, id: template.id, messages: await loadTemplates(user.id) });
  } catch (error) {
    console.error('Could not create automated message', error);
    return NextResponse.json({ error: 'Kunde inte skapa mallen.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await auth();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });
    const body = await request.json();
    const id = String(body?.id ?? '');
    if (!id) return NextResponse.json({ error: 'Mall-id saknas.' }, { status: 400 });
    const valid = validate(body);
    if ('error' in valid) return NextResponse.json({ error: valid.error }, { status: 400 });
    const admin = createAdminClient();
    const { data: owned } = await admin.from('automated_message_templates').select('id').eq('id', id).eq('owner_id', user.id).maybeSingle();
    if (!owned) return NextResponse.json({ error: 'Mallen hittades inte.' }, { status: 404 });
    const { error } = await admin.from('automated_message_templates').update({
      name: valid.name, body: valid.message, trigger_event: valid.trigger, offset_minutes: valid.offset,
      enabled: valid.enabled, all_listings: valid.allListings, updated_at: new Date().toISOString(),
    }).eq('id', id).eq('owner_id', user.id);
    if (error) throw error;
    await admin.from('automated_message_template_listings').delete().eq('template_id', id).eq('owner_id', user.id);
    if (!valid.allListings && valid.productIds.length) {
      const { error: listingError } = await admin.from('automated_message_template_listings').insert(valid.productIds.map(productId => ({ template_id: id, owner_id: user.id, product_id: productId })));
      if (listingError) throw listingError;
    }
    return NextResponse.json({ ok: true, messages: await loadTemplates(user.id) });
  } catch (error) {
    console.error('Could not update automated message', error);
    return NextResponse.json({ error: 'Kunde inte spara mallen.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await auth();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Mall-id saknas.' }, { status: 400 });
    const admin = createAdminClient();
    const { data: assets } = await admin.from('automated_message_template_assets').select('storage_path').eq('template_id', id).eq('owner_id', user.id);
    const { error } = await admin.from('automated_message_templates').delete().eq('id', id).eq('owner_id', user.id);
    if (error) throw error;
    if (assets?.length) await admin.storage.from('automated-message-assets').remove(assets.map(asset => asset.storage_path));
    return NextResponse.json({ ok: true, messages: await loadTemplates(user.id) });
  } catch (error) {
    console.error('Could not delete automated message', error);
    return NextResponse.json({ error: 'Kunde inte ta bort mallen.' }, { status: 500 });
  }
}
