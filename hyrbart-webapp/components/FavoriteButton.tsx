'use client';

import { MouseEvent, useEffect, useState } from 'react';

const EVENT='hyrbart:favorites-changed';
const STORAGE_KEY='hyrbart:favorites';

function readLegacyLocalFavorites(){
 try{
  const raw=window.localStorage.getItem(STORAGE_KEY);
  const parsed=raw?JSON.parse(raw):[];
  return Array.isArray(parsed)?parsed.filter((value):value is string=>typeof value==='string'):[];
 }catch{return [] as string[]}
}

function clearLegacyLocalFavorites(){
 try{window.localStorage.removeItem(STORAGE_KEY)}catch{}
}

function loginPath(){
 const en=/\/(?:topsecret\/)?en(?:\/|$)/.test(window.location.pathname);
 return `/topsecret/${en?'en':'sv'}/logga-in`;
}

export default function FavoriteButton({slug,label,compact=false}:{slug:string;label?:string;compact?:boolean}){
 const [favorite,setFavorite]=useState(false),[saving,setSaving]=useState(false);

 async function sync(){
  try{
   let response=await fetch('/api/favorites',{cache:'no-store'});
   if(response.status===401){setFavorite(false);return;}
   if(!response.ok)return;
   let data=await response.json() as {favorites?:string[]};

   const legacy=readLegacyLocalFavorites();
   if(legacy.length){
    const migrateResponse=await fetch('/api/favorites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({migrate:legacy})});
    if(migrateResponse.ok){
     data=await migrateResponse.json() as {favorites?:string[]};
     clearLegacyLocalFavorites();
    }
   }
   setFavorite((data.favorites??[]).includes(slug));
  }catch{}
 }

 useEffect(()=>{void sync();const listener=()=>void sync();window.addEventListener(EVENT,listener);return()=>window.removeEventListener(EVENT,listener)},[slug]);

 async function toggle(event:MouseEvent<HTMLButtonElement>){
  event.preventDefault();event.stopPropagation();if(saving)return;
  setSaving(true);
  try{
   const next=!favorite;
   const response=await fetch('/api/favorites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug,favorite:next})});
   if(response.status===401){window.location.href=loginPath();return;}
   if(!response.ok)throw new Error('Could not update favorite');
   const data=await response.json() as {favorites?:string[]};
   setFavorite((data.favorites??[]).includes(slug));
   window.dispatchEvent(new Event(EVENT));
  }catch{}
  finally{setSaving(false)}
 }

 return <button type="button" onClick={toggle} disabled={saving} aria-pressed={favorite} aria-label={favorite?'Ta bort från favoriter':'Lägg till i favoriter'} title={favorite?'Ta bort från favoriter':'Lägg till i favoriter'} style={{width:compact?38:44,height:compact?38:44,borderRadius:'999px',border:'1px solid rgba(21,25,27,.12)',background:'#fff',display:'inline-grid',placeItems:'center',cursor:'pointer',boxShadow:'0 3px 12px rgba(0,0,0,.08)',color:'#15191b',padding:0}}><svg width={compact?20:23} height={compact?20:23} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 3.8 12.7C1.1 10.1 1.2 5.9 4 3.7c2.4-1.9 5.8-1.4 8 1 2.2-2.4 5.6-2.9 8-1 2.8 2.2 2.9 6.4.2 9L12 20.5Z" fill={favorite?'#ffcc00':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>{label?<span style={{position:'absolute',clip:'rect(0 0 0 0)'}}>{label}</span>:null}</button>
}
