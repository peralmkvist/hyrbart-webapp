import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    countrycodes: 'se',
    dedupe: '1',
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'Hyrbart/0.1 (https://hyrbart.se)',
        'Accept-Language': 'sv',
      },
      cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ results: [] }, { status: 200 });
    const data = await response.json() as Array<{ display_name?: string; lat?: string; lon?: string; type?: string }>;
    return NextResponse.json({
      results: data.map((item) => ({
        label: item.display_name || '',
        lat: Number(item.lat),
        lng: Number(item.lon),
        type: item.type || '',
      })).filter((item) => item.label && Number.isFinite(item.lat) && Number.isFinite(item.lng)),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
