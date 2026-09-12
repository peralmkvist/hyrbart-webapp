'use client';

import { useState } from 'react';

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
 return <div className="profileMenuRow" style={{gap:14}}><span>{locale==='en'?'Language':'Språk'}</span><select aria-label={locale==='en'?'Language':'Språk'} value={locale} disabled={saving} onChange={e=>void change(e.target.value as 'sv'|'en')} style={{marginLeft:'auto',border:0,background:'transparent',font:'inherit',fontWeight:700,color:'inherit',outline:0}}><option value="sv">Svenska</option><option value="en">English</option></select></div>
}
