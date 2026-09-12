'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

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
      setMessage(en ? 'Push notifications are not configured yet.' : 'Pushnotiser är inte konfigurerade ännu.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error(en ? 'Notification permission was not granted.' : 'Tillåt notiser för att aktivera funktionen.');
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      }
      const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kunde inte aktivera notiser.');
      setEnabled(true);
      setMessage(en ? 'Push notifications are on.' : 'Pushnotiser är aktiverade.');
    } catch (err) { setMessage(err instanceof Error ? err.message : (en ? 'Could not enable notifications.' : 'Kunde inte aktivera notiser.')); }
    finally { setBusy(false); }
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
      setMessage(en ? 'Push notifications are off.' : 'Pushnotiser är avstängda.');
    } catch { setMessage(en ? 'Could not turn off notifications.' : 'Kunde inte stänga av notiser.'); }
    finally { setBusy(false); }
  }

  if (supported === null) return null;

  return <div className="pushSettingCard">
    <div className="pushSettingCopy">
      <strong>{en ? 'Push notifications' : 'Pushnotiser'}</strong>
      <span>{supported ? (en ? 'Get alerts for messages and booking requests.' : 'Få notiser om meddelanden och bokningsförfrågningar.') : (en ? 'Not supported in this browser. On iPhone, add Hyrbart to the Home Screen first.' : 'Stöds inte i den här webbläsaren. På iPhone behöver Hyrbart först läggas till på hemskärmen.')}</span>
      {message ? <small>{message}</small> : null}
    </div>
    {supported ? <button type="button" onClick={enabled ? disable : enable} disabled={busy}>{busy ? '…' : enabled ? (en ? 'On' : 'På') : (en ? 'Enable' : 'Aktivera')}</button> : null}
  </div>;
}
