import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ label: '' }, { status: 400 });

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        'User-Agent': 'Hyrbart/0.1 (https://hyrbart.se)',
        'Accept-Language': 'sv',
      },
      cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ label: '' });
    const data = await response.json() as { display_name?: string; address?: Record<string, string> };
    const a = data.address || {};
    const place = a.city || a.town || a.village || a.municipality || a.suburb || a.county;
    const road = [a.road, a.house_number].filter(Boolean).join(' ');
    const label = [road, place].filter(Boolean).join(', ') || data.display_name || '';
    return NextResponse.json({ label });
  } catch {
    return NextResponse.json({ label: '' });
  }
}
