'use client';

import { useEffect, useMemo, useState } from 'react';

type Job={id:string;source_platform:string;source_url:string;status:string;extracted_data:Record<string,unknown>;target_sanity_id:string|null;error_message:string|null;created_at:string;profile?:{display_name?:string|null;email?:string|null}|null};
const labels:Record<string,string>={pending:'Mottagen',processing:'Bearbetas',needs_review:'Behöver granskas',ready:'Redo',imported:'Importerad',rejected:'Avvisad',failed:'Misslyckades',cancelled:'Avbruten'};

export default function AdminImportQueue(){
  const [rows,setRows]=useState<Job[]>([]);
  const [filter,setFilter]=useState('active');
  const [q,setQ]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');

  async function load(){
    try{
      const response=await fetch('/api/admin/imports',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'LOAD_FAILED');
      setRows(data.jobs||[]);
    }catch{setError('Kunde inte läsa importkön.');}
  }
  useEffect(()=>{void load();},[]);

  const list=useMemo(()=>rows
    .filter(row=>filter==='all'||(filter==='active'?!['imported','rejected','failed','cancelled'].includes(row.status):row.status===filter))
    .filter(row=>`${row.profile?.display_name||''} ${row.profile?.email||''} ${row.source_url}`.toLowerCase().includes(q.toLowerCase())),[rows,filter,q]);

  async function update(job:Job,status:string,extra:Record<string,unknown>={}){
    setBusy(job.id);setError('');
    try{
      const response=await fetch(`/api/admin/imports/${job.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,...extra})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'SAVE_FAILED');
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Kunde inte uppdatera importen.');}
    finally{setBusy(null);}
  }

  async function addReviewData(job:Job){
    const initial=Object.keys(job.extracted_data||{}).length?JSON.stringify(job.extracted_data,null,2):'{\n  "title": "",\n  "description": "",\n  "price": null,\n  "category": ""\n}';
    const value=window.prompt('Granskningsdata som JSON. Detta är bara ett mellanlager och publiceras inte.',initial);
    if(value===null)return;
    try{const parsed=JSON.parse(value);await update(job,'needs_review',{extractedData:parsed});}catch{window.alert('JSON-formatet är inte giltigt.');}
  }

  async function markImported(job:Job){
    const id=window.prompt('Sanity-ID för det skapade Hyrbart-utkastet',job.target_sanity_id||'');
    if(!id?.trim())return;
    await update(job,'imported',{targetSanityId:id.trim()});
  }

  async function reject(job:Job){
    const reason=window.prompt('Anledning (valfritt)','');
    if(reason===null)return;
    await update(job,'rejected',{errorMessage:reason});
  }

  return <>
    <div className="adminStats"><div><b>{rows.filter(row=>row.status==='pending').length}</b><span>Mottagna</span></div><div><b>{rows.filter(row=>['processing','needs_review','ready'].includes(row.status)).length}</b><span>Pågående</span></div><div><b>{rows.filter(row=>row.status==='imported').length}</b><span>Importerade</span></div></div>
    <div className="adminTools"><input value={q} onChange={event=>setQ(event.target.value)} placeholder="Sök användare eller annonslänk"/><select value={filter} onChange={event=>setFilter(event.target.value)}><option value="active">Aktiva importer</option><option value="pending">Mottagna</option><option value="processing">Bearbetas</option><option value="needs_review">Behöver granskas</option><option value="ready">Redo</option><option value="imported">Importerade</option><option value="rejected">Avvisade</option><option value="all">Alla</option></select></div>
    {error?<div className="adminEmpty">{error}</div>:null}
    <div className="adminQueue">{list.map(job=><div key={job.id} className="adminCaseRow" style={{cursor:'default'}}>
      <div className={`adminStatus ${job.status==='imported'?'resolved':job.status==='rejected'?'rejected':'open'}`}/>
      <div style={{minWidth:0}}><span>{job.source_platform==='hygglo'?'Hygglo':'Extern marknadsplats'} · {new Date(job.created_at).toLocaleDateString('sv-SE')}</span><strong>{job.profile?.display_name||job.profile?.email||'Användare'}</strong><a href={job.source_url} target="_blank" rel="noreferrer" style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.source_url}</a><small>{labels[job.status]||job.status}{Object.keys(job.extracted_data||{}).length?` · ${Object.keys(job.extracted_data).length} importerade fält`:''}</small></div>
      <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
        {job.status==='pending'?<button disabled={busy===job.id} onClick={()=>void update(job,'processing')} style={buttonStyle}>Starta</button>:null}
        {job.status==='processing'?<button disabled={busy===job.id} onClick={()=>void addReviewData(job)} style={buttonStyle}>Till granskning</button>:null}
        {job.status==='needs_review'?<button disabled={busy===job.id} onClick={()=>void update(job,'ready')} style={buttonStyle}>Markera redo</button>:null}
        {job.status==='ready'?<button disabled={busy===job.id} onClick={()=>void markImported(job)} style={buttonStyle}>Markera importerad</button>:null}
        {!['imported','rejected','failed','cancelled'].includes(job.status)?<button disabled={busy===job.id} onClick={()=>void reject(job)} style={secondaryStyle}>Avvisa</button>:<b>{labels[job.status]||job.status}</b>}
      </div>
    </div>)}{!list.length?<div className="adminEmpty">Inga importer matchar filtret.</div>:null}</div>
  </>;
}

const buttonStyle={border:0,borderRadius:12,padding:'9px 12px',fontWeight:800,background:'var(--accent)',cursor:'pointer'} as const;
const secondaryStyle={border:'1px solid var(--line)',borderRadius:12,padding:'9px 12px',fontWeight:700,background:'#fff',cursor:'pointer'} as const;
