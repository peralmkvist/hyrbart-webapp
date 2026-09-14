'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Host={id:string;displayName:string;city:string|null;avatarUrl:string|null;bio:string|null;verified:boolean};

export default function FollowersList({locale}:{locale:string}){
  const en=locale==='en';
  const [profiles,setProfiles]=useState<Host[]>([]);
  const [loading,setLoading]=useState(true);
  const [failed,setFailed]=useState(false);
  async function load(){
    setLoading(true);setFailed(false);
    try{
      const response=await fetch('/api/follows?mode=followers',{cache:'no-store'});
      if(!response.ok)throw new Error();
      const data=await response.json() as {profiles?:Host[]};
      setProfiles(data.profiles||[]);
    }catch{setFailed(true)}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[]);
  if(loading)return <p role="status" className="ds2Intro">{en?'Loading followers…':'Laddar följare…'}</p>;
  if(failed)return <div role="alert"><p>{en?'We could not load your followers.':'Vi kunde inte ladda dina följare.'}</p><button className="launchStateButton" onClick={()=>void load()}>{en?'Try again':'Försök igen'}</button></div>;
  if(!profiles.length)return <div style={{padding:'28px 0'}}><h2 style={{margin:'0 0 8px'}}>{en?'No followers yet':'Inga följare ännu'}</h2><p className="ds2Intro" style={{margin:0}}>{en?'People who follow your host profile will appear here.':'Personer som följer din uthyrarprofil kommer att visas här.'}</p></div>;
  return <div><p className="ds2Intro" style={{margin:'0 0 18px'}}>{profiles.length} {en?(profiles.length===1?'follower':'followers'):'följare'}</p><div style={{display:'grid',gap:12}}>{profiles.map(profile=><Link key={profile.id} href={`/${locale}/profil/${profile.id}`} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',border:'1px solid var(--line)',borderRadius:18,textDecoration:'none',color:'inherit',background:'#fff'}}>
    {profile.avatarUrl?<img src={profile.avatarUrl} alt="" style={{width:52,height:52,borderRadius:'50%',objectFit:'cover'}}/>:<span aria-hidden="true" style={{width:52,height:52,borderRadius:'50%',display:'grid',placeItems:'center',background:'#f0f0f0',fontWeight:800}}>{profile.displayName.charAt(0).toUpperCase()}</span>}
    <span style={{flex:1,minWidth:0}}><strong style={{display:'block'}}>{profile.displayName}{profile.verified?' ✓':''}</strong>{profile.city?<span style={{color:'var(--muted)',fontSize:14}}>{profile.city}</span>:null}</span><span aria-hidden="true">›</span>
  </Link>)}</div></div>;
}
