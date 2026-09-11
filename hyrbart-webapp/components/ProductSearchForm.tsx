'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from './Icons';

type Props = { locale:string; initialQuery?:string; category?:string; initialFrom?:string; initialTo?:string; initialPlace?:string; initialRadius?:string; initiallyCollapsed?:boolean };
const RECENT_SEARCHES_KEY='hyrbartRecentSearches';
function compactDate(value:string,en:boolean){if(!value)return'';return new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`))}
function isoDate(date:Date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return`${y}-${m}-${d}`}
function monthCells(cursor:Date){const year=cursor.getFullYear(),month=cursor.getMonth(),first=new Date(year,month,1),mondayIndex=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();return Array.from({length:mondayIndex+days},(_,i)=>{const day=i-mondayIndex+1;return day>=1&&day<=days?new Date(year,month,day):null})}

export default function ProductSearchForm({locale,initialQuery='',category,initialFrom='',initialTo='',initialPlace='',initialRadius='10',initiallyCollapsed=false}:Props){
 const router=useRouter(),en=locale==='en';
 const formRef=useRef<HTMLFormElement>(null),placeInputRef=useRef<HTMLInputElement>(null),calendarScrollRef=useRef<HTMLDivElement>(null);
 const [expanded,setExpanded]=useState(!initiallyCollapsed),[calendarOpen,setCalendarOpen]=useState(false);
 const [query,setQuery]=useState(initialQuery),[from,setFrom]=useState(initialFrom),[to,setTo]=useState(initialTo),[place,setPlace]=useState(initialPlace),[radius,setRadius]=useState(initialRadius);
 const [searchStarted,setSearchStarted]=useState(Boolean(initialQuery.trim()||initialFrom||initialTo||initiallyCollapsed));
 useEffect(()=>{if(!searchStarted)return;function handleOutside(event:PointerEvent){if(formRef.current&&!formRef.current.contains(event.target as Node)){setCalendarOpen(false);setSearchStarted(false)}}document.addEventListener('pointerdown',handleOutside);return()=>document.removeEventListener('pointerdown',handleOutside)},[searchStarted]);
 const today=isoDate(new Date());
 const baseMonth=useMemo(()=>{const source=initialFrom?new Date(`${initialFrom}T12:00:00`):new Date();return new Date(source.getFullYear(),source.getMonth(),1)},[initialFrom]);
 const months=useMemo(()=>Array.from({length:12},(_,i)=>new Date(baseMonth.getFullYear(),baseMonth.getMonth()+i,1)),[baseMonth]);
 const weekdays=en?['M','T','W','T','F','S','S']:['M','T','O','T','F','L','S'];
 const hasActiveFilters=Boolean(query||from||to||category||place||radius!=='10');
 function rememberSearch(search:{q?:string;from?:string;to?:string;place?:string;radius?:string}){if(typeof window==='undefined')return;try{const normalized={q:search.q?.trim()||'',from:search.from||'',to:search.to||'',place:search.place?.trim()||'',radius:search.radius||'10',ts:Date.now()};const key=`${normalized.q}|${normalized.from}|${normalized.to}|${normalized.place}|${normalized.radius}`;const current=JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY)||'[]');const list=Array.isArray(current)?current:[];const deduped=list.filter((item)=>`${item?.q||''}|${item?.from||''}|${item?.to||''}|${item?.place||''}|${item?.radius||'10'}`!==key);window.localStorage.setItem(RECENT_SEARCHES_KEY,JSON.stringify([normalized,...deduped].slice(0,5)))}catch{}}
 function navigate(next:{query?:string;from?:string;to?:string;place?:string;radius?:string}={},collapse=true){const qv=next.query??query,fv=next.from??from,tv=next.to??to,pv=next.place??place,rv=next.radius??radius;const params=new URLSearchParams();if(qv.trim())params.set('q',qv.trim());if(category)params.set('category',category);if(fv)params.set('from',fv);if(tv)params.set('to',tv);if(pv.trim())params.set('place',pv.trim());if(rv)params.set('radius',rv);if(collapse){rememberSearch({q:qv,from:fv,to:tv||fv,place:pv,radius:rv});setCalendarOpen(false);setExpanded(false);window.scrollTo(0,0)}router.push(`/${locale}/produkter?${params.toString()}`,{scroll:collapse})}
 function resetSearch(){setQuery('');setFrom('');setTo('');setPlace('');setRadius('10');setCalendarOpen(false);setExpanded(true);setSearchStarted(false);router.push(`/${locale}`,{scroll:false})}
 function handleSubmit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!searchStarted)return;navigate()}
 function handleQueryKeyDown(event:KeyboardEvent<HTMLInputElement>){if(event.key!=='Enter')return;event.preventDefault();setSearchStarted(true);event.currentTarget.blur();setCalendarOpen(true);requestAnimationFrame(()=>calendarScrollRef.current?.scrollTo({top:0,behavior:'smooth'}))}
 function finishCalendar(){setCalendarOpen(false);if(from)navigate({from,to:to||from},false);requestAnimationFrame(()=>{placeInputRef.current?.focus();placeInputRef.current?.select()})}
 function clearCalendar(){setFrom('');setTo('');setCalendarOpen(false);navigate({from:'',to:''},false)}
 function chooseDate(value:string){if(value<today)return;if(!from||(from&&to)){setFrom(value);setTo('');return}if(value<from){setFrom(value);setTo('');return}setTo(value)}
 function handlePlaceKeyDown(event:KeyboardEvent<HTMLInputElement>){if(event.key==='Enter'){event.preventDefault();navigate()}}
 const dateLabel=from?(to?`${compactDate(from,en)} – ${compactDate(to,en)}`:compactDate(from,en)):(en?'When do you need it?':'När behöver du det?');
 const whatLabel=query||(en?'All products':'Alla produkter'),whereLabel=place?`${place} · ${radius} km`:(en?'Where do you need it?':'Var behöver du det?');
 if(!expanded)return <button type="button" className="rentalSearchCompact2" onClick={()=>{setExpanded(true);setSearchStarted(true)}} aria-label={en?'Edit search':'Ändra sökning'}><SearchIcon/><span><b>{whatLabel}</b><small>{dateLabel} · {whereLabel}</small></span><span className="rentalSearchEdit2">☰</span></button>;
 return <form ref={formRef} onSubmit={handleSubmit} className={`rentalSearchFlow2 ${calendarOpen?'calendarIsOpen':''}`}>
  <style jsx global>{`
   .rentalSearchFlow2 > .rentalSearchField2:first-child { min-height: 54px !important; height: 54px !important; }
   .rentalSearchFlow2 > .rentalSearchField2:first-child input { height: 100% !important; }
   .rentalSearchFlow2 .rentalSearchField2 input,
   .rentalSearchFlow2 .rentalSearchRow2 small { font-size: 17px !important; line-height: 1.25 !important; }
   .rentalSearchFlow2 .rentalSearchField2 input::placeholder,
   .rentalSearchFlow2 .rentalSearchRow2 small { color: #747b8b !important; opacity: 1 !important; font-weight: 400 !important; }
  `}</style>
  <label className="rentalSearchField2"><span><input value={query} onFocus={()=>setSearchStarted(true)} onChange={e=>setQuery(e.target.value)} onKeyDown={handleQueryKeyDown} enterKeyHint="next" placeholder={en?'What do you need?':'Vad behöver du?'}/></span><SearchIcon/></label>
  {searchStarted&&<>
  <div className="rentalWhenWrap2"><button type="button" className="rentalSearchRow2" onClick={()=>setCalendarOpen(v=>!v)}><span><small>{dateLabel}</small></span><span className="rentalPlus2">＋</span></button>
   {calendarOpen&&<div className="rentalCalendar2 rentalCalendarOverlay2"><div className="rentalCalendarScroll2" ref={calendarScrollRef}>{months.map((month,monthIndex)=>{const monthLabel=new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{month:'long',year:'numeric'}).format(month),cells=monthCells(month);return <section className="rentalCalendarMonth2" key={`${month.getFullYear()}-${month.getMonth()}`}><strong className="rentalCalendarMonthTitle2">{monthLabel}</strong>{monthIndex===0&&<div className="rentalWeekdays2">{weekdays.map((d,i)=><span key={`${d}-${i}`}>{d}</span>)}</div>}<div className="rentalCalendarGrid2">{cells.map((date,i)=>{if(!date)return <span key={`blank-${monthIndex}-${i}`}/>;const value=isoDate(date),disabled=value<today,selectedStart=value===from,selectedEnd=value===to,inRange=Boolean(from&&to&&value>from&&value<to);return <button type="button" key={value} disabled={disabled} className={`${selectedStart||selectedEnd?'selected':''} ${inRange?'inRange':''}`} onClick={()=>chooseDate(value)}>{date.getDate()}</button>})}</div></section>})}</div><div className="rentalCalendarFooter2"><button type="button" className="clear" onClick={clearCalendar}>{en?'Clear':'Rensa'}</button><button type="button" className="done" disabled={!from} onClick={finishCalendar}>{en?'Done':'Klar'}</button></div></div>}
  </div>
  <div className="rentalSearchField2 rentalWhereField2"><span><input ref={placeInputRef} value={place} onChange={e=>setPlace(e.target.value)} onBlur={()=>{if(place.trim()!==initialPlace.trim())navigate({place},false)}} onKeyDown={handlePlaceKeyDown} enterKeyHint="search" placeholder={en?'Where do you need it?':'Var behöver du det?'}/></span><label className="rentalRadiusInline2"><small>{radius} km</small><input aria-label={en?'Search radius':'Sökradie'} type="range" min="1" max="50" step="1" value={radius} onChange={e=>setRadius(e.target.value)} onPointerUp={e=>navigate({radius:(e.currentTarget as HTMLInputElement).value},false)} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))navigate({radius:e.currentTarget.value},false)}}/></label></div>
  <div className="rentalSearchActions2">{hasActiveFilters&&<button type="button" className="rentalSearchReset2" onClick={resetSearch}>{en?'Clear filters':'Rensa filter'}</button>}<button type="submit" className="rentalSearchSubmit2"><SearchIcon/>{en?'Search':'Sök'}</button></div>
  </>}
 </form>
}
