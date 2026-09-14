'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FavoritesGrid from './FavoritesGrid';

type FavoriteProduct={slug:string;brand:string;name:string;type:string;typeEn?:string;price:string;image?:string;accent?:string;badge?:'popular'|'very-popular'};
type Host={id:string;displayName:string;city:string|null;avatarUrl:string|null;bio:string|null;verified:boolean};

export default function FavoritesHub({locale,products}:{locale:string;products:FavoriteProduct[]}){
  const en=locale==='en';
  const [tab,setTab]=useState<'listings'|'hosts'>('listings');
  const [hosts,setHosts]=useState<Host[]>([]);
  const [loading,setLoading]=useState(false);
  const [failed,setFailed]=useState(false);

  async function loadHosts(){
    setLoading(true);setFailed(false);
    try{
      const response=await fetch('/api/follows?mode=following',{cache:'no-store'});
      if(!response.ok)throw new Error();
      const data=await response.json() as {profiles?:Host[]};
      setHosts(data.profiles||[]);
    }catch{setFailed(true)}finally{setLoading(false)}
  }
  useEffect(()=>{void loadHosts();const listener=()=>void loadHosts();window.addEventListener('hyrbart:follows-changed',listener);return()=>window.removeEventListener('hyrbart:follows-changed',listener)},[]);

  return <>
    <div role="tablist" aria-label={en?'Favorite type':'Typ av favorit'} style={{display:'flex',gap:6,padding:'0 20px 16px'}}>
      <button role="tab" aria-selected={tab==='listings'} onClick={()=>setTab('listings')} style={{border:0,borderRadius:999,padding:'10px 16px',fontWeight:700,cursor:'pointer',background:tab==='listings'?'#111':'#f1f1f1',color:tab==='listings'?'#fff':'#111'}}>{en?'Listings':'Annonser'}</button>
      <button role="tab" aria-selected={tab==='hosts'} onClick={()=>setTab('hosts')} style={{border:0,borderRadius:999,padding:'10px 16px',fontWeight:700,cursor:'pointer',background:tab==='hosts'?'#111':'#f1f1f1',color:tab==='hosts'?'#fff':'#111'}}>{en?'Hosts':'Uthyrare'}</button>
    </div>
    {tab==='listings'?<FavoritesGrid locale={locale} products={products}/>:<section aria-label={en?'Followed hosts':'Följda uthyrare'} style={{padding:'0 20px 40px'}}>
      <header style={{marginBottom:18}}><h1 style={{margin:'0 0 6px'}}>{en?'Followed hosts':'Följda uthyrare'}</h1><p className="ds2Intro" style={{margin:0}}>{en?'Hosts you follow are collected here.':'Uthyrare du följer samlas här.'}</p></header>
      {loading?<p role="status">{en?'Loading hosts…':'Laddar uthyrare…'}</p>:failed?<div role="alert"><p>{en?'We could not load followed hosts.':'Vi kunde inte ladda följda uthyrare.'}</p><button className="launchStateButton" onClick={()=>void loadHosts()}>{en?'Try again':'Försök igen'}</button></div>:!hosts.length?<p className="ds2Intro">{en?'You are not following any hosts yet.':'Du följer inga uthyrare ännu.'}</p>:<div style={{display:'grid',gap:12}}>{hosts.map(host=><Link key={host.id} href={`/${locale}/profil/${host.id}`} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',border:'1px solid var(--line)',borderRadius:18,textDecoration:'none',color:'inherit',background:'#fff'}}>
        {host.avatarUrl?<img src={host.avatarUrl} alt="" style={{width:54,height:54,borderRadius:'50%',objectFit:'cover'}}/>:<span aria-hidden="true" style={{width:54,height:54,borderRadius:'50%',display:'grid',placeItems:'center',background:'#f0f0f0',fontSize:20,fontWeight:800}}>{host.displayName.charAt(0).toUpperCase()}</span>}
        <span style={{minWidth:0,flex:1}}><strong style={{display:'block'}}>{host.displayName}{host.verified?' ✓':''}</strong>{host.city?<span style={{display:'block',color:'var(--muted)',fontSize:14}}>{host.city}</span>:null}{host.bio?<span style={{display:'block',color:'var(--muted)',fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{host.bio}</span>:null}</span><span aria-hidden="true">›</span>
      </Link>)}</div>}
    </section>}
  </>;
}
