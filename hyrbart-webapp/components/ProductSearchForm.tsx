'use client';

import { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from './Icons';

export default function ProductSearchForm({
  locale,
  initialQuery = '',
  category,
}: {
  locale: string;
  initialQuery?: string;
  category?: string;
}) {
  const router = useRouter();
  const en = locale === 'en';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('q') as HTMLInputElement | null;
    const value = input?.value.trim() ?? '';

    input?.blur();

    const params = new URLSearchParams();
    if (value) params.set('q', value);
    if (category) params.set('category', category);
    const suffix = params.toString();

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    router.push(`/${locale}/produkter${suffix ? `?${suffix}` : ''}`, { scroll: true });

    // iOS can briefly retain the keyboard-sized visual viewport after submit.
    // Reasserting the top position after navigation lets the fixed bottom bar
    // settle back against the real bottom edge.
    window.setTimeout(() => window.scrollTo(0, 0), 80);
  }

  return (
    <form onSubmit={handleSubmit} className="searchField2 rentSearch2" role="search">
      <SearchIcon aria-hidden="true" />
      <input
        type="search"
        name="q"
        defaultValue={initialQuery}
        enterKeyHint="search"
        autoComplete="off"
        aria-label={en ? 'Search products' : 'Sök produkter'}
        placeholder={en ? 'Search product, category or use' : 'Sök produkt, kategori eller tillfälle'}
      />
      <button type="submit" className="rentSearchButton2" aria-label={en ? 'Search' : 'Sök'}>
        <SearchIcon />
      </button>
    </form>
  );
}
