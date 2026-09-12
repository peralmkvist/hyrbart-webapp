'use client';

import { useEffect, useMemo, useState } from 'react';

type Claim={
  id:string;source_platform:string;source_profile_url:string;claimed_rating:number|null;claimed_review_count:number|null;
  status:'pending'|'verified'|'rejected';verified_rating:number|null;verified_review_count:number|null;created_at:string;
  profile?:{display_name?:string|null;email?:string|null;city?:string|null}|null;
};

export default function AdminReputationQueue(){
  const [rows,setRows]=useState<Claim[]>([]);
  const [filter,setFilter]=useState<'pending'|'verified'|'rejected'|'all'>('pending');
  const [q,setQ]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');

  async function load(){
    try{
      const response=await fetch('/api/admin/reputation',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'LOAD_FAILED');
      setRows(data.claims||[]);
    }catch{setError('Kunde inte läsa verifieringskön.');}
  }
  useEffect(()=>{void load();},[]);

  const list=useMemo(()=>rows
    .filter(row=>filter==='all'||row.status===filter)
    .filter(row=>`${row.profile?.display_name||''} ${row.profile?.email||''} ${row.source_profile_url}`.toLowerCase().includes(q.toLowerCase())),[rows,filter,q]);

  async function decide(row:Claim,status:'verified'|'rejected'){
    let verifiedRating: string|number|null=row.claimed_rating;
    let verifiedReviewCount: string|number|null=row.claimed_review_count;
    let adminNote='';
    if(status==='verified'){
      const rating=window.prompt('Verifierat betyg (1–5, lämna tomt om ej tillämpligt)',row.claimed_rating?.toString()||'');
      if(rating===null)return;
      const count=window.prompt('Verifierat antal omdömen',row.claimed_review_count?.toString()||'');
      if(count===null)return;
      verifiedRating=rating.trim()===''?null:rating;
      verifiedReviewCount=count.trim()===''?null:count;
      if(verifiedRating==null&&verifiedReviewCount==null){window.alert('Ange minst ett verifierat värde.');return;}
    }else{
      const note=window.prompt('Varför kunde historiken inte verifieras? (valfritt)','');
      if(note===null)return;
      adminNote=note;
    }
    setBusy(row.id);setError('');
    try{
      const response=await fetch(`/api/admin/reputation/${row.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,verifiedRating,verifiedReviewCount,adminNote})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'SAVE_FAILED');
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Kunde inte spara beslutet.');}
    finally{setBusy(null);}
  }

  if(error&&!rows.length)return <div className="adminEmpty">{error}</div>;
  return <>
    <div className="adminStats"><div><b>{rows.filter(row=>row.status==='pending').length}</b><span>Väntar</span></div><div><b>{rows.filter(row=>row.status==='verified').length}</b><span>Verifierade</span></div><div><b>{rows.filter(row=>row.status==='rejected').length}</b><span>Avvisade</span></div></div>
    <div className="adminTools"><input value={q} onChange={event=>setQ(event.target.value)} placeholder="Sök användare eller profillänk"/><select value={filter} onChange={event=>setFilter(event.target.value as typeof filter)}><option value="pending">Väntar på verifiering</option><option value="verified">Verifierade</option><option value="rejected">Avvisade</option><option value="all">Alla</option></select></div>
    {error?<div className="adminEmpty">{error}</div>:null}
    <div className="adminQueue">{list.map(row=><div key={row.id} className="adminCaseRow" style={{cursor:'default'}}>
      <div className={`adminStatus ${row.status==='verified'?'resolved':row.status==='rejected'?'rejected':'open'}`}/>
      <div style={{minWidth:0}}><span>{row.source_platform==='hygglo'?'Hygglo':'Extern plattform'} · {new Date(row.created_at).toLocaleDateString('sv-SE')}</span><strong>{row.profile?.display_name||row.profile?.email||'Användare'}</strong><small>{row.claimed_rating!=null?`Angivet betyg ${row.claimed_rating}`:''}{row.claimed_review_count!=null?`${row.claimed_rating!=null?' · ':''}${row.claimed_review_count} omdömen`:''}</small><a href={row.source_profile_url} target="_blank" rel="noreferrer" style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.source_profile_url}</a></div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>{row.status==='pending'?<><button disabled={busy===row.id} onClick={()=>void decide(row,'verified')} style={{border:0,borderRadius:12,padding:'9px 12px',fontWeight:800,background:'var(--accent)'}}>Verifiera</button><button disabled={busy===row.id} onClick={()=>void decide(row,'rejected')} style={{border:'1px solid var(--line)',borderRadius:12,padding:'9px 12px',fontWeight:700,background:'#fff'}}>Avvisa</button></>:<b>{row.status==='verified'?`✓ ${row.verified_rating??''}${row.verified_review_count!=null?` · ${row.verified_review_count}`:''}`:'Avvisad'}</b>}</div>
    </div>)}{!list.length?<div className="adminEmpty">Inga poster matchar filtret.</div>:null}</div>
  </>;
}
