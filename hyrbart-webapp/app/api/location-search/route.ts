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
    const data = await response.json() as Array<{ display_name?: string; lat?: string; lon?: string; type?: string; address?: Record<string,string> }>;
    return NextResponse.json({
      results: data.map((item) => {
        const a=item.address||{};
        const city=a.city||a.town||a.village||a.municipality||a.county||'';
        const area=a.suburb||a.neighbourhood||a.quarter||a.city_district||'';
        const address=[a.road,a.house_number].filter(Boolean).join(' ');
        return {
          label: item.display_name || '',
          lat: Number(item.lat),
          lng: Number(item.lon),
          type: item.type || '',
          city,
          area,
          address,
        };
      }).filter((item) => item.label && Number.isFinite(item.lat) && Number.isFinite(item.lng)),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
