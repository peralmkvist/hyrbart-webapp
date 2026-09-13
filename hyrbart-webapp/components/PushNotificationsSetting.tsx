'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

const BellIcon = () => (
  <span className="profileMenuIcon" aria-hidden="true">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
      <path d="M10 21h4"/>
    </svg>
  </span>
);

export default function PushNotificationsSetting({ locale }: { locale: string }) {
  const en = locale === 'en';
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.register('/sw.js').then(async registration => {
      const subscription = await registration.pushManager.getSubscription();
      setEnabled(Boolean(subscription));
    }).catch(() => setSupported(false));
  }, []);

  async function enable() {
    if (!publicKey) {
      setMessage(en ? 'Not configured yet' : 'Inte konfigurerat ännu');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error(en ? 'Permission needed' : 'Tillåt notiser i webbläsaren');
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (en ? 'Could not enable notifications' : 'Kunde inte aktivera notiser'));
      setEnabled(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : (en ? 'Could not enable notifications' : 'Kunde inte aktivera notiser'));
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setEnabled(false);
    } catch {
      setMessage(en ? 'Could not turn off notifications' : 'Kunde inte stänga av notiser');
    } finally { setBusy(false); }
  }

  const value = supported === false ? 'unsupported' : enabled ? 'on' : 'off';
  const status = message || (supported === false ? (en ? 'Not supported here' : 'Stöds inte här') : '');

  return <div className="profileMenuRow profileInlineSetting">
    <BellIcon />
    <span className="profileMenuLabel profileSettingLabel">
      <span>{en ? 'Push notifications' : 'Pushnotiser'}</span>
      {status ? <small role="status">{status}</small> : null}
    </span>
    <select
      className="profileInlineSelect"
      aria-label={en ? 'Push notifications' : 'Pushnotiser'}
      value={supported === null ? 'loading' : value}
      disabled={busy || supported !== true}
      onChange={event => {
        if (event.target.value === 'on') void enable();
        if (event.target.value === 'off') void disable();
      }}
    >
      {supported === null ? <option value="loading">…</option> : null}
      {supported === false ? <option value="unsupported">{en ? 'Unavailable' : 'Ej tillgängligt'}</option> : null}
      <option value="off">{en ? 'Off' : 'Av'}</option>
      <option value="on">{en ? 'On' : 'På'}</option>
    </select>
  </div>;
}
