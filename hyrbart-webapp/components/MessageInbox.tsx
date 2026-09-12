'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SearchIcon } from './Icons';

type Tab = 'all' | 'host' | 'renter' | 'support';
type MessageItem={id:string;tab:Exclude<Tab,'all'>;name:string;initials:string;preview:string;meta:string;time:string;unread?:boolean;href:string};
type BookingRequestItem={id:string;from:string;to:string;requestType:string;message?:string;status?:string;createdAt?:string;product?:string;role?:'owner'|'renter';participantName?:string;latestMessage?:string|null;latestMessageAt?:string|null;unreadMessage?:boolean};

function statusText(status:string|undefined,en:boolean){
 const sv:Record<string,string>={requested:'förfrågan',reserved:'reserverad',accepted:'godkänd',paid:'betald',active:'pågående',returned:'återlämnad',completed:'slutförd',declined:'nekad',cancelled:'avbokad',disputed:'tvist',refunded:'återbetald'};
 const english:Record<string,string>={requested:'request',reserved:'reserved',accepted:'accepted',paid:'paid',active:'active',returned:'returned',completed:'completed',declined:'declined',cancelled:'cancelled',disputed:'disputed',refunded:'refunded'};
 return (en?english:sv)[status||''] || (en?'booking':'bokning');
}

function dateMeta(value:string,en:boolean){
 try{return new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`))}catch{return value}
}

export default function MessageInbox({locale}:{locale:string}){
 const en=locale==='en';const pathname=usePathname();const hostMode=pathname.includes('/vard/');const [tab,setTab]=useState<Tab>('all');const [query,setQuery]=useState('');const [items,setItems]=useState<MessageItem[]>([]);const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;fetch('/api/booking-request',{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json() as {requests?:BookingRequestItem[]};if(!active)return;setItems((data.requests??[]).map((request):MessageItem=>{const ownerView=request.role==='owner';const product=request.product||(en?'Product':'Produkt');const name=request.participantName||(ownerView?(en?'Renter':'Hyrare'):(en?'Host':'Uthyrare'));const fallback=request.message?.trim()||(ownerView?(en?'New booking request':'Ny bokningsförfrågan'):(en?'Booking request sent':'Bokningsförfrågan skickad'));const preview=request.latestMessage?.trim()||fallback;const stamp=request.latestMessageAt||request.createdAt;const created=stamp?new Date(stamp):null;const time=created&&Number.isFinite(created.getTime())?created.toLocaleTimeString(en?'en-GB':'sv-SE',{hour:'2-digit',minute:'2-digit'}):'';return{id:`booking-${request.id}`,tab:ownerView?'renter':'host',name,initials:(name.trim().charAt(0)||'H').toUpperCase(),preview,meta:`${product} · ${dateMeta(request.from,en)}–${dateMeta(request.to,en)} · ${statusText(request.status,en)}`,time,unread:Boolean(request.unreadMessage)||(ownerView&&['requested','reserved'].includes(request.status||'')),href:`/${locale}/bokningar/${request.id}`}}));setLoading(false)}).catch(()=>{if(active){setItems([]);setLoading(false)}});return()=>{active=false}},[en,locale]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return items.filter(item=>(tab==='all'||item.tab===tab)&&(!q||`${item.name} ${item.preview} ${item.meta}`.toLowerCase().includes(q)))},[items,query,tab]);
 const labels=en?{title:'Messages',all:'All',host:'Hosts',renter:'Renters',support:'Support',search:'Search messages',empty:'No conversations yet'}:{title:'Meddelanden',all:'Alla',host:'Uthyrare',renter:'Hyrare',support:'Support',search:'Sök meddelanden',empty:'Inga konversationer ännu'};
 return <section className="messagesPage"><header className="messagesHeader"><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><h1>{labels.title}</h1>{hostMode?<Link href={`/${locale}/vard/meddelanden/automatiserade`} style={{minHeight:42,padding:'0 13px',borderRadius:13,background:'#f0f0ee',display:'inline-flex',alignItems:'center',fontSize:'.78rem',fontWeight:800,color:'var(--ink)',textAlign:'center'}}>{en?'Automated customer messages':'Automatiserade kundmeddelanden'}</Link>:null}</div><div className="messagesSearchWrap"><SearchIcon/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={labels.search} aria-label={labels.search}/></div></header><div className="messagesTabs" role="tablist" aria-label={labels.title}>{([['all',labels.all],['host',labels.host],['renter',labels.renter],['support',labels.support]] as [Tab,string][]).map(([value,label])=><button key={value} type="button" role="tab" aria-selected={tab===value} className={tab===value?'active':''} onClick={()=>setTab(value)}>{label}</button>)}</div><div className="messageList">{loading?<div className="messageEmpty">{en?'Loading…':'Laddar…'}</div>:filtered.length?filtered.map(item=><Link href={item.href} className="messageRow" key={item.id}><span className="messageAvatar">{item.initials}</span><span className="messageCopy"><span className="messageTopline"><strong>{item.name}</strong><time>{item.time}</time></span><span className="messagePreview">{item.preview}</span><span className="messageMeta">{item.unread&&<i aria-hidden="true"/>} {item.meta}</span></span></Link>):<div className="messageEmpty">{labels.empty}</div>}</div></section>
}
