'use client';
import { useState } from 'react';

type Review={id:string;booking_id:string;reviewer_role:string;overall_rating:number;comment:string|null;submitted_at:string;moderation_status:string|null;moderation_reason:string|null};

export default function AdminReviewModeration({reviews}:{reviews:Review[]}){
  const [rows,setRows]=useState(reviews),[busy,setBusy]=useState<string|null>(null);
  async function change(id:string,status:'visible'|'hidden'){
    const row=rows.find(r=>r.id===id); if(!row)return;
    const reason=status==='hidden'?window.prompt('Ange varför omdömet döljs:','')?.trim()||'':'';
    if(status==='hidden'&&reason.length<5)return;
    setBusy(id);
    const res=await fetch(`/api/admin/reviews/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,reason})});
    if(res.ok)setRows(v=>v.map(r=>r.id===id?{...r,moderation_status:status,moderation_reason:status==='hidden'?reason:null}:r));
    setBusy(null);
  }
  if(!rows.length)return <p>Inga omdömen.</p>;
  return <div style={{display:'grid',gap:10}}>{rows.map(r=><article key={r.id} style={{borderTop:'1px solid var(--line)',padding:'12px 0'}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><strong>★ {r.overall_rating} · {r.reviewer_role}</strong><small style={{display:'block'}}>{new Date(r.submitted_at).toLocaleString('sv-SE')} · {r.booking_id}</small></div><b>{r.moderation_status==='hidden'?'Dolt':'Synligt'}</b></div>{r.comment?<p>{r.comment}</p>:null}{r.moderation_reason?<small>Orsak: {r.moderation_reason}</small>:null}<div style={{marginTop:8}}>{r.moderation_status==='hidden'?<button disabled={busy===r.id} onClick={()=>change(r.id,'visible')}>Återställ</button>:<button disabled={busy===r.id} onClick={()=>change(r.id,'hidden')}>Dölj omdöme</button>}</div></article>)}</div>;
}
