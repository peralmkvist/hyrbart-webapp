'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FavoritesGrid from './FavoritesGrid';
import styles from './FavoritesHub.module.css';

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
    <div role="tablist" aria-label={en?'Favorite type':'Typ av favorit'} className={styles.tabs}>
      <button role="tab" aria-selected={tab==='listings'} onClick={()=>setTab('listings')} className={`${styles.tab} ${tab==='listings'?styles.tabActive:''}`}>{en?'Listings':'Annonser'}</button>
      <button role="tab" aria-selected={tab==='hosts'} onClick={()=>setTab('hosts')} className={`${styles.tab} ${tab==='hosts'?styles.tabActive:''}`}>{en?'Hosts':'Uthyrare'}</button>
    </div>
    {tab==='listings'?<FavoritesGrid locale={locale} products={products}/>:<section aria-label={en?'Followed hosts':'Följda uthyrare'} className={styles.hosts}>
      <header className={styles.header}><h1 className={styles.title}>{en?'Followed hosts':'Följda uthyrare'}</h1><p className={`ds2Intro ${styles.intro}`}>{en?'Hosts you follow are collected here.':'Uthyrare du följer samlas här.'}</p></header>
      {loading?<p role="status">{en?'Loading hosts…':'Laddar uthyrare…'}</p>:failed?<div role="alert"><p>{en?'We could not load followed hosts.':'Vi kunde inte ladda följda uthyrare.'}</p><button className="launchStateButton" onClick={()=>void loadHosts()}>{en?'Try again':'Försök igen'}</button></div>:!hosts.length?<p className="ds2Intro">{en?'You are not following any hosts yet.':'Du följer inga uthyrare ännu.'}</p>:<div className={styles.grid}>{hosts.map(host=><Link key={host.id} href={`/${locale}/profil/${host.id}`} className={styles.hostLink}>
        {host.avatarUrl?<img src={host.avatarUrl} alt="" className={styles.avatar}/>:<span aria-hidden="true" className={styles.avatarFallback}>{host.displayName.charAt(0).toUpperCase()}</span>}
        <span className={styles.copy}><strong className={styles.name}>{host.displayName}{host.verified?' ✓':''}</strong>{host.city?<span className={styles.city}>{host.city}</span>:null}{host.bio?<span className={styles.bio}>{host.bio}</span>:null}</span><span aria-hidden="true">›</span>
      </Link>)}</div>}
    </section>}
  </>;
}
