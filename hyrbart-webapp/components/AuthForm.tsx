'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm({ locale }: { locale: string }) {
  const en = locale === 'en';
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/topsecret/${locale}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (authError) throw authError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Could not send login link.' : 'Kunde inte skicka inloggningslänken.'));
    } finally {
      setBusy(false);
    }
  }

  return <form className="authCard" onSubmit={submit}>
    {!sent ? <>
      <label className="authField">
        <span>{en ? 'Email' : 'E-post'}</span>
        <input type="email" autoComplete="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="per@example.com" required />
      </label>
      <button className="authPrimary" type="submit" disabled={busy}>{busy ? (en ? 'Sending…' : 'Skickar…') : (en ? 'Continue' : 'Fortsätt')}</button>
      <p className="authFineprint">{en ? 'We will email you a secure login link. No password needed.' : 'Vi mejlar en säker inloggningslänk till dig. Du behöver inget lösenord.'}</p>
    </> : <div className="authSuccess">
      <div className="authSuccessIcon">✓</div>
      <h2>{en ? 'Check your inbox' : 'Kolla din inkorg'}</h2>
      <p>{en ? `We sent a login link to ${email}.` : `Vi skickade en inloggningslänk till ${email}.`}</p>
      <button type="button" className="authSecondary" onClick={()=>setSent(false)}>{en ? 'Use another email' : 'Använd en annan e-postadress'}</button>
    </div>}
    {error && <p className="authError">{error}</p>}
  </form>;
}
