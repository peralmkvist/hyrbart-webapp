'use client';
import {FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

type BeginResult={secret:string;otpauthUri:string};

export default function AdminMfaSetup({locale}:{locale:string}){
  const en=locale==='en';
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [begin,setBegin]=useState<BeginResult|null>(null);
  const [codes,setCodes]=useState<string[]|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{(async()=>{
    const status=await fetch('/api/admin/auth/mfa',{cache:'no-store'});
    if(!status.ok){setError(en?'Your admin setup session is missing or expired.':'Din adminsession för installation saknas eller har gått ut.');setLoading(false);return;}
    const data=await status.json();
    if(data.mfaEnabled&&data.mfaVerified){router.replace(`/${locale}/admin`);return;}
    const res=await fetch('/api/admin/auth/mfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'begin'})});
    if(!res.ok){setError(en?'Could not start two-factor setup.':'Kunde inte starta tvåstegsverifieringen.');setLoading(false);return;}
    setBegin(await res.json());setLoading(false);
  })()},[en,locale,router]);

  async function confirm(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');
    const form=new FormData(e.currentTarget);
    const res=await fetch('/api/admin/auth/mfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'confirm',code:form.get('code')})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){setError(en?'The code was not accepted. Check the time on your device and try again.':'Koden godkändes inte. Kontrollera tiden på din enhet och försök igen.');setBusy(false);return;}
    setCodes(data.recoveryCodes||[]);setBusy(false);
  }

  if(loading)return <p>{en?'Preparing two-factor authentication…':'Förbereder tvåstegsverifiering…'}</p>;
  if(error&&!begin)return <p role="alert">{error}</p>;
  if(codes)return <div style={{display:'grid',gap:16}}>
    <h2>{en?'Save your recovery codes':'Spara dina återställningskoder'}</h2>
    <p>{en?'Each code can be used once if you lose access to your authenticator. Store them somewhere safe; they will not be shown again.':'Varje kod kan användas en gång om du förlorar åtkomsten till din autentiseringsapp. Förvara dem säkert; de visas inte igen.'}</p>
    <pre style={{padding:16,border:'1px solid var(--line)',borderRadius:14,whiteSpace:'pre-wrap'}}>{codes.join('\n')}</pre>
    <button onClick={()=>{router.replace(`/${locale}/admin`);router.refresh()}} style={{padding:'13px 16px',border:0,borderRadius:999,fontWeight:850}}>{en?'I have saved the codes — continue':'Jag har sparat koderna — fortsätt'}</button>
  </div>;
  if(!begin)return <p role="alert">{error}</p>;

  return <form onSubmit={confirm} style={{display:'grid',gap:16}}>
    <div>
      <h2>{en?'1. Add Hyrbart Admin to your authenticator':'1. Lägg till Hyrbart Admin i din autentiseringsapp'}</h2>
      <p>{en?'Use the manual setup key below in Google Authenticator, Microsoft Authenticator, 1Password or another TOTP-compatible app.':'Använd installationsnyckeln nedan i Google Authenticator, Microsoft Authenticator, 1Password eller annan TOTP-kompatibel app.'}</p>
      <code style={{display:'block',padding:14,border:'1px solid var(--line)',borderRadius:12,fontSize:16,wordBreak:'break-all'}}>{begin.secret}</code>
      <details style={{marginTop:10}}><summary>{en?'Advanced: otpauth link':'Avancerat: otpauth-länk'}</summary><code style={{display:'block',marginTop:8,wordBreak:'break-all'}}>{begin.otpauthUri}</code></details>
    </div>
    <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'2. Enter the 6-digit code':'2. Ange den 6-siffriga koden'}<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:20,letterSpacing:'.2em'}}/></label>
    {error?<p role="alert" style={{margin:0,color:'#9b1c1c'}}>{error}</p>:null}
    <button disabled={busy} type="submit" style={{padding:'13px 16px',border:0,borderRadius:999,fontWeight:850}}>{busy?(en?'Verifying…':'Verifierar…'):(en?'Enable two-factor authentication':'Aktivera tvåstegsverifiering')}</button>
  </form>;
}
