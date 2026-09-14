'use client';

import {FormEvent,useEffect,useState} from 'react';

type Membership={user_id:string;email:string|null;role:string;active:boolean;granted_at:string;updated_at:string};
const ROLES=['super_admin','support','trust_safety','finance','operations','read_only'];

export default function AdminRoleManager(){
  const [rows,setRows]=useState<Membership[]>([]),[email,setEmail]=useState(''),[role,setRole]=useState('read_only'),[loading,setLoading]=useState(true),[error,setError]=useState('');
  async function load(){setLoading(true);const r=await fetch('/api/admin/memberships',{cache:'no-store'});if(!r.ok){setError('Kunde inte hämta roller.');setLoading(false);return}const d=await r.json();setRows(d.memberships||[]);setError('');setLoading(false)}
  useEffect(()=>{void load()},[]);
  async function save(e:FormEvent){e.preventDefault();const r=await fetch('/api/admin/memberships',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,role,active:true})});const d=await r.json().catch(()=>({}));if(!r.ok){setError(d.error||'Kunde inte spara rollen.');return}setEmail('');setError('');await load()}
  async function update(row:Membership,next:{role?:string;active?:boolean}){const r=await fetch('/api/admin/memberships',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:row.user_id,role:next.role??row.role,active:next.active??row.active})});const d=await r.json().catch(()=>({}));if(!r.ok){setError(d.error||'Kunde inte uppdatera rollen.');return}setError('');await load()}
  return <div style={{display:'grid',gap:18}}><form onSubmit={save} className="adminQueue" style={{padding:18,display:'grid',gap:12}}><h2>Lägg till administratör</h2><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="E-postadress"/><select value={role} onChange={e=>setRole(e.target.value)}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select><button type="submit">Lägg till</button>{error?<p style={{color:'crimson'}}>{error}</p>:null}</form><div className="adminQueue">{loading?<div className="adminEmpty">Laddar…</div>:rows.map(row=><div key={row.user_id} className="adminCaseRow" style={{cursor:'default'}}><div className={`adminStatus ${row.active?'resolved':'rejected'}`}/><div><strong>{row.email||row.user_id}</strong><small>{row.user_id}</small></div><select value={row.role} onChange={e=>void update(row,{role:e.target.value})}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select><button type="button" onClick={()=>void update(row,{active:!row.active})}>{row.active?'Inaktivera':'Aktivera'}</button></div>)}{!loading&&!rows.length?<div className="adminEmpty">Inga adminroller ännu.</div>:null}</div></div>
}
