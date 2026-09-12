'use client';

import { useState } from 'react';

const GlobeIcon = () => (
  <span className="profileMenuIcon" aria-hidden="true">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M3 12h18"/>
      <path d="M12 3c2.5 2.4 4 5.4 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.4-4-9s1.5-6.6 4-9Z"/>
    </svg>
  </span>
);

export default function ProfileLanguageSetting({locale}:{locale:string}){
 const [saving,setSaving]=useState(false);
 async function change(value:'sv'|'en'){
  if(value===locale||saving)return;
  setSaving(true);
  try{
   const response=await fetch('/api/profile/preferences',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({preferredLanguage:value})});
   if(!response.ok)throw new Error();
   const next=window.location.pathname.replace(/\/(sv|en)(?=\/|$)/,`/${value}`);
   window.location.href=`${next}${window.location.search}${window.location.hash}`;
  }finally{setSaving(false)}
 }
 return <div className="profileMenuRow"><GlobeIcon/><span className="profileMenuLabel">{locale==='en'?'Language':'Språk'}</span><select aria-label={locale==='en'?'Language':'Språk'} value={locale} disabled={saving} onChange={e=>void change(e.target.value as 'sv'|'en')} style={{marginLeft:'auto',border:0,background:'transparent',font:'inherit',fontWeight:700,color:'inherit',outline:0}}><option value="sv">Svenska</option><option value="en">English</option></select></div>
}
