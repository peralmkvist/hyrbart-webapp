import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/sanity-products';

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('sv-SE');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = normalize(searchParams.get('q') || '');
  if (!q) return NextResponse.json({ results: [] });

  const products = await getProducts();
  const candidates = new Map<string, { label: string; kind: 'type' | 'product' | 'category' }>();

  for (const product of products) {
    const values: Array<{ label?: string; kind: 'type' | 'product' | 'category' }> = [
      { label: product.type, kind: 'type' },
      { label: `${product.brand} ${product.name}`.trim(), kind: 'product' },
      { label: product.category, kind: 'category' },
    ];
    for (const item of values) {
      if (!item.label || !normalize(item.label).includes(q)) continue;
      const key = normalize(item.label);
      if (!candidates.has(key)) candidates.set(key, { label: item.label, kind: item.kind });
    }
  }

  const results = [...candidates.values()]
    .sort((a, b) => {
      const aStarts = normalize(a.label).startsWith(q) ? 0 : 1;
      const bStarts = normalize(b.label).startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const kindOrder = { type: 0, category: 1, product: 2 };
      if (kindOrder[a.kind] !== kindOrder[b.kind]) return kindOrder[a.kind] - kindOrder[b.kind];
      return a.label.localeCompare(b.label, 'sv');
    })
    .slice(0, 6);

  return NextResponse.json({ results });
}
