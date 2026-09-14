'use client';
import {FormEvent,useEffect,useState} from 'react';

type Account={id:string;user_id:string;username:string;active:boolean;failed_attempts:number;locked_until:string|null;password_changed_at:string;mfa_enabled:boolean;email:string|null;membership?:{role:string;active:boolean}|null};

export default function AdminAccountManager(){
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function load(){const r=await fetch('/api/admin/accounts',{cache:'no-store'});if(!r.ok){setError('Kunde inte läsa adminkonton.');return;}const b=await r.json();setAccounts(b.accounts||[])}
  useEffect(()=>{void load()},[]);
  async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);const r=await fetch('/api/admin/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',email:f.get('email'),username:f.get('username'),password:f.get('password')})});if(!r.ok){const b=await r.json().catch(()=>({}));setError(b.error||'Kunde inte skapa adminkontot.');setBusy(false);return;}e.currentTarget.reset();await load();setBusy(false)}
  async function act(accountId:string,action:string,payload:Record<string,unknown>={}){setBusy(true);setError('');const r=await fetch('/api/admin/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId,action,...payload})});if(!r.ok){const b=await r.json().catch(()=>({}));setError(b.error||'Åtgärden misslyckades.');setBusy(false);return;}await load();setBusy(false)}
  async function resetPassword(accountId:string){const password=window.prompt('Nytt lösenord (minst 12 tecken)');if(!password)return;await act(accountId,'reset_password',{password})}
  return <div style={{display:'grid',gap:24}}>
    <section style={{border:'1px solid var(--line)',borderRadius:18,padding:18}}>
      <h2 style={{marginTop:0}}>Skapa adminkonto</h2>
      <p style={{color:'var(--muted)'}}>Användaren måste först ha en aktiv adminroll under Roller & behörigheter. Lösenordet skickas endast till servern och lagras aldrig i klartext.</p>
      <form onSubmit={create} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
        <input name="email" type="email" required placeholder="Hyrbart-kontots e-post" style={{padding:11,border:'1px solid var(--line)',borderRadius:10}}/>
        <input name="username" required minLength={3} maxLength={64} pattern="[a-z0-9._-]{3,64}" placeholder="Admin-användarnamn" style={{padding:11,border:'1px solid var(--line)',borderRadius:10}}/>
        <input name="password" type="password" required minLength={12} placeholder="Initialt lösenord" style={{padding:11,border:'1px solid var(--line)',borderRadius:10}}/>
        <button disabled={busy} type="submit" style={{padding:11,borderRadius:10,border:0,fontWeight:850}}>Skapa</button>
      </form>
    </section>
    {error?<p role="alert" style={{color:'#9b1c1c'}}>{error}</p>:null}
    <section className="adminQueue">
      {accounts.map(a=><div key={a.id} className="adminCaseRow" style={{cursor:'default',alignItems:'center'}}>
        <div className={`adminStatus ${a.active?'resolved':'rejected'}`}/>
        <div><span>{a.email||a.user_id}</span><strong>{a.username}</strong><small>{a.membership?.role||'ingen aktiv roll'} · {a.active?'aktiv':'spärrad'}{a.locked_until?` · låst till ${new Date(a.locked_until).toLocaleString('sv-SE')}`:''}</small></div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
          <button disabled={busy} onClick={()=>void act(a.id,'set_active',{active:!a.active})}>{a.active?'Spärra':'Aktivera'}</button>
          <button disabled={busy} onClick={()=>void resetPassword(a.id)}>Nytt lösenord</button>
          <button disabled={busy} onClick={()=>void act(a.id,'revoke_sessions')}>Återkalla sessioner</button>
        </div>
      </div>)}
      {!accounts.length?<div className="adminEmpty">Inga separata adminkonton ännu.</div>:null}
    </section>
  </div>;
}
