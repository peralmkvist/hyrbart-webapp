'use client';
import { useMemo, useState } from 'react';

type Review={id:string;booking_id:string;reviewer_role:string;overall_rating:number;comment:string|null;submitted_at:string;moderation_status:string|null;moderation_reason:string|null};
type Report={id:string;review_id:string;reason:string;details:string|null;created_at:string;status:string};
const REASON_LABELS:Record<string,string>={harassment:'Trakasserier eller kränkningar',hate:'Hat eller diskriminering',personal_data:'Personuppgifter',false_information:'Felaktiga uppgifter',irrelevant:'Irrelevant innehåll',other:'Annat'};

export default function AdminReviewModeration({reviews,reports=[]}:{reviews:Review[];reports?:Report[]}){
  const [rows,setRows]=useState(reviews),[openReports,setOpenReports]=useState(reports),[busy,setBusy]=useState<string|null>(null);
  const reportsByReview=useMemo(()=>{const out=new Map<string,Report[]>();for(const report of openReports){const list=out.get(report.review_id)||[];list.push(report);out.set(report.review_id,list)}return out},[openReports]);

  async function change(id:string,status:'visible'|'hidden',reportResolution?:'dismissed'){
    const row=rows.find(r=>r.id===id); if(!row)return;
    const reason=status==='hidden'?window.prompt('Ange varför omdömet döljs:','')?.trim()||'':'';
    if(status==='hidden'&&reason.length<5)return;
    if(reportResolution==='dismissed'&&!window.confirm('Behåll omdömet synligt och avfärda alla öppna rapporter för det?'))return;
    setBusy(id);
    const res=await fetch(`/api/admin/reviews/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,reason,reportResolution})});
    if(res.ok){
      setRows(v=>v.map(r=>r.id===id?{...r,moderation_status:status,moderation_reason:status==='hidden'?reason:null}:r));
      if(status==='hidden'||reportResolution==='dismissed')setOpenReports(v=>v.filter(report=>report.review_id!==id));
    }
    setBusy(null);
  }
  if(!rows.length)return <p>Inga omdömen.</p>;
  return <div style={{display:'grid',gap:10}}>{rows.map(r=>{const rowReports=reportsByReview.get(r.id)||[];return <article key={r.id} style={{borderTop:'1px solid var(--line)',padding:'14px 0'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><strong>★ {r.overall_rating} · {r.reviewer_role}</strong><small style={{display:'block'}}>{new Date(r.submitted_at).toLocaleString('sv-SE')} · {r.booking_id}</small></div><b>{r.moderation_status==='hidden'?'Dolt':'Synligt'}</b></div>
    {r.comment?<p>{r.comment}</p>:null}{r.moderation_reason?<small>Modereringsorsak: {r.moderation_reason}</small>:null}
    {rowReports.length?<div style={{marginTop:12,padding:'12px 14px',border:'1px solid var(--line)',borderRadius:12}}><strong>{rowReports.length} {rowReports.length===1?'öppen rapport':'öppna rapporter'}</strong>{rowReports.map(report=><div key={report.id} style={{marginTop:8}}><span>{REASON_LABELS[report.reason]||report.reason}</span><small style={{display:'block'}}>{new Date(report.created_at).toLocaleString('sv-SE')}{report.details?` · ${report.details}`:''}</small></div>)}</div>:null}
    <div style={{marginTop:10,display:'flex',gap:8,flexWrap:'wrap'}}>{r.moderation_status==='hidden'?<button disabled={busy===r.id} onClick={()=>change(r.id,'visible')}>Återställ</button>:<><button disabled={busy===r.id} onClick={()=>change(r.id,'hidden')}>Dölj omdöme</button>{rowReports.length?<button disabled={busy===r.id} onClick={()=>change(r.id,'visible','dismissed')}>Behåll & avfärda rapporter</button>:null}</>}</div>
  </article>})}</div>;
}
