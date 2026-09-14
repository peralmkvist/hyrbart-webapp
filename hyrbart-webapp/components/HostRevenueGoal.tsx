'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type GoalData = {
  month: string;
  revenue: number;
  target: number | null;
  percent: number | null;
  difference: number | null;
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function HostRevenueGoal({ locale = 'sv' }: { locale?: string }) {
  const en = locale === 'en';
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<GoalData | null>(null);
  const [targetInput, setTargetInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const formatter = useMemo(() => new Intl.NumberFormat(en ? 'en-GB' : 'sv-SE'), [en]);

  async function load(selectedMonth: string) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/host-revenue-goal?month=${encodeURIComponent(selectedMonth)}`, { cache: 'no-store' });
      const payload = await response.json() as GoalData & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Load failed');
      setData(payload);
      setTargetInput(payload.target ? String(payload.target) : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Could not load goal.' : 'Kunde inte läsa målet.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(month); }, [month]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const value = Number(targetInput);
    if (!Number.isFinite(value) || value < 1) {
      setError(en ? 'Enter a goal above SEK 0.' : 'Ange ett mål över 0 kr.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/host-revenue-goal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ month, targetAmount: Math.round(value) }),
      });
      const payload = await response.json() as GoalData & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Save failed');
      setData(payload);
      setTargetInput(payload.target ? String(payload.target) : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Could not save goal.' : 'Kunde inte spara målet.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeGoal() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/host-revenue-goal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ month, targetAmount: null }),
      });
      const payload = await response.json() as GoalData & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Remove failed');
      setData(payload);
      setTargetInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Could not remove goal.' : 'Kunde inte ta bort målet.'));
    } finally {
      setSaving(false);
    }
  }

  const progress = data?.target ? Math.min(100, Math.max(0, Math.round((data.revenue / data.target) * 100))) : 0;
  const overTarget = (data?.difference ?? -1) >= 0;

  return (
    <section className="hostRevenueGoal139" aria-label={en ? 'Monthly revenue goal' : 'Månadsvis intäktsmål'}>
      <div className="hostRevenueGoal139Header">
        <div>
          <span>{en ? 'Monthly goal' : 'Månadsvis mål'}</span>
          <strong>{en ? 'Revenue target' : 'Intäktsmål'}</strong>
        </div>
        <input type="month" value={month} onChange={event => setMonth(event.target.value)} aria-label={en ? 'Select month' : 'Välj månad'} />
      </div>

      {loading ? <p className="hostRevenueGoal139Muted">{en ? 'Loading…' : 'Laddar…'}</p> : null}

      {!loading && data ? (
        <>
          <div className="hostRevenueGoal139Numbers">
            <div><span>{en ? 'Revenue' : 'Intäkt'}</span><strong>{formatter.format(data.revenue)} kr</strong></div>
            <div><span>{en ? 'Goal' : 'Mål'}</span><strong>{data.target ? `${formatter.format(data.target)} kr` : '–'}</strong></div>
            <div><span>{en ? 'Progress' : 'Måluppfyllelse'}</span><strong>{data.percent == null ? '–' : `${data.percent}%`}</strong></div>
          </div>

          {data.target ? (
            <>
              <div className="hostRevenueGoal139Track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={en ? 'Revenue goal progress' : 'Måluppfyllelse'}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="hostRevenueGoal139Status">
                {overTarget
                  ? (en ? `${formatter.format(data.difference || 0)} SEK above goal` : `${formatter.format(data.difference || 0)} kr över målet`)
                  : (en ? `${formatter.format(Math.abs(data.difference || 0))} SEK remaining` : `${formatter.format(Math.abs(data.difference || 0))} kr kvar till målet`)}
              </p>
            </>
          ) : (
            <p className="hostRevenueGoal139Status">{en ? 'No goal set for this month.' : 'Inget mål är satt för den här månaden.'}</p>
          )}

          <form onSubmit={save} className="hostRevenueGoal139Form">
            <label>
              <span>{data.target ? (en ? 'Edit goal' : 'Ändra mål') : (en ? 'Set goal' : 'Sätt mål')}</span>
              <div><input type="number" min="1" max="10000000" step="100" inputMode="numeric" value={targetInput} onChange={event => setTargetInput(event.target.value)} placeholder={en ? 'e.g. 5000' : 't.ex. 5000'} /><i>kr</i></div>
            </label>
            <button type="submit" disabled={saving}>{saving ? (en ? 'Saving…' : 'Sparar…') : (en ? 'Save goal' : 'Spara mål')}</button>
            {data.target ? <button type="button" className="secondary" onClick={removeGoal} disabled={saving}>{en ? 'Remove' : 'Ta bort'}</button> : null}
          </form>

          <p className="hostRevenueGoal139Definition">
            {en
              ? 'Revenue = gross rental price before Hyrbart fees for bookings starting in the selected month with status paid, active, returned or completed.'
              : 'Intäkt = bruttohyra före Hyrbarts avgifter för bokningar med startdatum i vald månad och status betald, aktiv, återlämnad eller slutförd.'}
          </p>
        </>
      ) : null}

      {error ? <p className="hostRevenueGoal139Error" role="alert">{error}</p> : null}

      <style jsx>{`
        .hostRevenueGoal139 { margin:14px 0 22px; padding:18px; border:1px solid var(--line); border-radius:20px; background:#fff; }
        .hostRevenueGoal139Header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
        .hostRevenueGoal139Header > div { display:grid; gap:2px; }
        .hostRevenueGoal139Header span { color:var(--muted); font-size:.8rem; }
        .hostRevenueGoal139Header strong { font-size:1.05rem; }
        .hostRevenueGoal139Header input { min-height:40px; border:1px solid var(--line); border-radius:12px; padding:0 10px; background:#f8f8f6; color:var(--ink); font:inherit; }
        .hostRevenueGoal139Numbers { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:16px 0 12px; }
        .hostRevenueGoal139Numbers div { display:grid; gap:3px; min-width:0; }
        .hostRevenueGoal139Numbers span { color:var(--muted); font-size:.78rem; }
        .hostRevenueGoal139Numbers strong { font-size:1rem; }
        .hostRevenueGoal139Track { height:12px; overflow:hidden; border-radius:999px; background:#ecece8; }
        .hostRevenueGoal139Track span { display:block; height:100%; border-radius:inherit; background:var(--accent); transition:width .2s ease; }
        .hostRevenueGoal139Status { margin:8px 0 0; color:var(--ink); font-size:.88rem; font-weight:700; }
        .hostRevenueGoal139Form { display:flex; align-items:end; gap:8px; margin-top:16px; flex-wrap:wrap; }
        .hostRevenueGoal139Form label { display:grid; gap:5px; flex:1 1 180px; }
        .hostRevenueGoal139Form label > span { font-size:.82rem; font-weight:800; }
        .hostRevenueGoal139Form label > div { position:relative; }
        .hostRevenueGoal139Form input { width:100%; min-height:43px; border:1px solid var(--line); border-radius:12px; background:#f8f8f6; padding:0 42px 0 12px; color:var(--ink); font:inherit; }
        .hostRevenueGoal139Form i { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--muted); font-style:normal; }
        .hostRevenueGoal139Form button { min-height:43px; padding:0 14px; border:1px solid var(--accent); border-radius:12px; background:var(--accent); color:#111; font-weight:800; cursor:pointer; }
        .hostRevenueGoal139Form button.secondary { border-color:var(--line); background:#fff; color:var(--ink); }
        .hostRevenueGoal139Form button:disabled { opacity:.55; cursor:default; }
        .hostRevenueGoal139Definition,.hostRevenueGoal139Muted { margin:14px 0 0; color:var(--muted); font-size:.78rem; line-height:1.4; }
        .hostRevenueGoal139Error { margin:12px 0 0; color:#8f1d1d; font-size:.84rem; font-weight:700; }
        @media (max-width:520px) { .hostRevenueGoal139Header { flex-direction:column; } .hostRevenueGoal139Header input { width:100%; } .hostRevenueGoal139Numbers { grid-template-columns:1fr 1fr; } .hostRevenueGoal139Numbers div:last-child { grid-column:1 / -1; } .hostRevenueGoal139Form button { flex:1 1 120px; } }
      `}</style>
    </section>
  );
}
