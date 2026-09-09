'use client';

import { useState } from 'react';
import {
  set,
  unset,
  useClient,
  useFormValue,
  type ArrayOfObjectsInputProps,
  type FieldProps,
} from 'sanity';

type PathSegment = string | number;
type TranslationEntry = {
  id: string;
  text: string;
  path: PathSegment[];
};

type TranslationResponse = {
  translations?: Record<string, string>;
  error?: string;
};

type RentalPriceValue = {
  _key?: string;
  _type?: string;
  days?: number;
  price?: number;
};

export function CompactField(props: FieldProps) {
  const topLevel = props.path.length === 1;
  return (
    <div style={topLevel ? { marginBlock: '-8px' } : undefined}>
      {props.renderDefault(props)}
    </div>
  );
}

export function RentalPricesInput(props: ArrayOfObjectsInputProps) {
  const prices = (props.value ?? []) as RentalPriceValue[];
  const days = [1, 3, 7] as const;

  function updatePrice(dayCount: 1 | 3 | 7, rawValue: string) {
    const existing = prices.find((item) => item.days === dayCount);
    const others = prices.filter((item) => item.days !== dayCount);
    const trimmed = rawValue.trim();

    if (!trimmed) {
      props.onChange(others.length ? set(others) : unset());
      return;
    }

    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue)) return;

    const next = [
      ...others,
      {
        ...existing,
        _key: existing?._key ?? `${dayCount}d`,
        _type: 'rentalPrice',
        days: dayCount,
        price: numericValue,
      },
    ].sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

    props.onChange(set(next));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
      {days.map((dayCount) => {
        const price = prices.find((item) => item.days === dayCount)?.price;
        return (
          <label key={dayCount} style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            <span>{dayCount} {dayCount === 1 ? 'dag' : 'dagar'}</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={price ?? ''}
              onChange={(event) => updatePrice(dayCount, event.currentTarget.value)}
              disabled={props.readOnly}
              style={{
                width: '100%',
                minWidth: 0,
                height: '38px',
                padding: '0 10px',
                border: '1px solid #c7c7c7',
                borderRadius: '4px',
                background: props.readOnly ? '#f3f3f3' : '#fff',
                font: 'inherit',
              }}
              aria-label={`Pris för ${dayCount} ${dayCount === 1 ? 'dag' : 'dagar'}`}
            />
          </label>
        );
      })}
    </div>
  );
}

function collectLocalizedStrings(
  value: unknown,
  path: PathSegment[],
  entries: TranslationEntry[],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLocalizedStrings(item, [...path, index], entries));
    return;
  }

  if (!value || typeof value !== 'object') return;

  const record = value as Record<string, unknown>;
  if (typeof record.sv === 'string' && record.sv.trim()) {
    entries.push({
      id: `t${entries.length}`,
      text: record.sv,
      path: [...path, 'en'],
    });
    return;
  }

  Object.entries(record).forEach(([key, child]) => {
    if (key.startsWith('_')) return;
    collectLocalizedStrings(child, [...path, key], entries);
  });
}

function setAtPath(target: any, path: PathSegment[], value: string) {
  let current = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    const nextSegment = path[i + 1];
    if (current[segment] == null) {
      current[segment] = typeof nextSegment === 'number' ? [] : {};
    }
    current = current[segment];
  }
  current[path[path.length - 1]] = value;
}

export function TranslationToolInput() {
  const client = useClient({ apiVersion: '2025-02-19' });
  const documentId = useFormValue(['_id']) as string | undefined;
  const typeSv = useFormValue(['typeSv']);
  const typeEn = useFormValue(['typeEn']);
  const cardHighlight = useFormValue(['cardHighlight']);
  const included = useFormValue(['included']);
  const description = useFormValue(['description']);
  const specifications = useFormValue(['specifications']);
  const guideSections = useFormValue(['guideSections']);

  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function translate() {
    if (!documentId || busy) return;

    const source: Record<string, unknown> = {
      typeSv,
      typeEn,
      cardHighlight,
      included,
      description,
      specifications,
      guideSections,
    };

    const entries: TranslationEntry[] = [];
    if (typeof typeSv === 'string' && typeSv.trim()) {
      entries.push({ id: `t${entries.length}`, text: typeSv, path: ['typeEn'] });
    }

    ['cardHighlight', 'included', 'description', 'specifications', 'guideSections']
      .forEach((key) => collectLocalizedStrings(source[key], [key], entries));

    if (!entries.length) {
      setStatus('Det finns ingen svensk text att översätta.');
      return;
    }

    let accessKey = window.sessionStorage.getItem('hyrbartTranslationKey') || '';
    if (!accessKey) {
      accessKey = window.prompt('Ange Hyrbarts översättningsnyckel. Den sparas bara under den här webbläsarsessionen.') || '';
      if (!accessKey) return;
      window.sessionStorage.setItem('hyrbartTranslationKey', accessKey);
    }

    setBusy(true);
    setStatus(`Översätter ${entries.length} texter…`);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Translation-Key': accessKey,
        },
        body: JSON.stringify({
          entries: entries.map(({ id, text }) => ({ id, text })),
        }),
      });

      const result = (await response.json()) as TranslationResponse;
      if (response.status === 401) {
        window.sessionStorage.removeItem('hyrbartTranslationKey');
        throw new Error('Fel översättningsnyckel. Klicka på knappen igen och ange rätt nyckel.');
      }
      if (!response.ok || !result.translations) {
        throw new Error(result.error || 'Översättningen misslyckades.');
      }

      const next = structuredClone(source);
      for (const entry of entries) {
        const translated = result.translations[entry.id];
        if (typeof translated !== 'string' || !translated.trim()) {
          throw new Error('Översättningstjänsten returnerade ett ofullständigt svar.');
        }
        setAtPath(next, entry.path, translated);
      }

      const baseId = documentId.replace(/^drafts\./, '');
      const draftId = `drafts.${baseId}`;

      if (!documentId.startsWith('drafts.')) {
        const published = await client.getDocument(baseId);
        if (published) {
          await client.createIfNotExists({ ...published, _id: draftId });
        }
      }

      const patch: Record<string, unknown> = {};
      Object.entries(next).forEach(([key, value]) => {
        if (value !== undefined) patch[key] = value;
      });

      await client.patch(draftId).set(patch).commit();
      setStatus(`Klart – ${entries.length} engelska texter har fyllts i. Granska och publicera när du är nöjd.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Översättningen misslyckades.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      padding: '14px',
      border: '1px solid #d8d8d8',
      borderRadius: '8px',
      background: '#fafafa',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '6px' }}>Automatisk översättning</div>
      <div style={{ fontSize: '13px', lineHeight: 1.45, marginBottom: '12px', color: '#555' }}>
        Översätter alla svenska produkttexter till engelska på en gång. Befintliga engelska texter skrivs över, men svenska texter, priser, mått, modellnamn och annan produktdata lämnas oförändrade.
      </div>
      <button
        type="button"
        onClick={translate}
        disabled={busy}
        style={{
          border: 0,
          borderRadius: '6px',
          padding: '9px 14px',
          fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
          background: '#c6f000',
          color: '#111',
          opacity: busy ? 0.65 : 1,
        }}
      >
        {busy ? 'Översätter…' : 'Översätt svenska → engelska'}
      </button>
      {status ? (
        <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: 1.4 }}>{status}</div>
      ) : null}
    </div>
  );
}
