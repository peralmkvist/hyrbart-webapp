'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from './Icons';

type Props = {
  locale: string;
  initialQuery?: string;
  category?: string;
  initialFrom?: string;
  initialTo?: string;
  initialPlace?: string;
  initialRadius?: string;
  initialNearby?: boolean;
  initiallyCollapsed?: boolean;
};

type ProductSuggestion = { label: string; kind: 'type' | 'product' | 'category' };
type RecentSearch = { q?: string; from?: string; to?: string; place?: string; radius?: string; nearby?: boolean; ts?: number };
type ActiveStep = 'what' | 'when' | null;

const RECENT_SEARCHES_KEY = 'hyrbartRecentSearches';

function compactDate(value: string, en: boolean) {
  if (!value) return '';
  return new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
}
function isoDate(date: Date) { const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
function monthCells(cursor: Date) { const y=cursor.getFullYear(),m=cursor.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(); return Array.from({length:offset+days},(_,i)=>{const day=i-offset+1;return day>=1&&day<=days?new Date(y,m,day):null}); }
function BackIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}

export default function ProductSearchForm({locale,initialQuery='',category,initialFrom='',initialTo='',initialPlace='',initialRadius='10',initialNearby=false,initiallyCollapsed=false}:Props){
  const router=useRouter(),en=locale==='en',formRef=useRef<HTMLFormElement>(null),queryInputRef=useRef<HTMLInputElement>(null),calendarScrollRef=useRef<HTMLDivElement>(null);
  const[expanded,setExpanded]=useState(!initiallyCollapsed),[activeStep,setActiveStep]=useState<ActiveStep>(null),[query,setQuery]=useState(initialQuery),[from,setFrom]=useState(initialFrom),[to,setTo]=useState(initialTo),[searchStarted,setSearchStarted]=useState(Boolean(initialQuery.trim()||initialFrom||initialTo||initiallyCollapsed)),[recentSearches,setRecentSearches]=useState<RecentSearch[]>([]),[productSuggestions,setProductSuggestions]=useState<ProductSuggestion[]>([]),[showProductSuggestions,setShowProductSuggestions]=useState(false);
  useEffect(()=>{try{const parsed=JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY)||'[]');if(Array.isArray(parsed))setRecentSearches(parsed.slice(0,5))}catch{setRecentSearches([])}},[]);
  useEffect(()=>{if(!searchStarted)return;function outside(event:PointerEvent){if(formRef.current&&!formRef.current.contains(event.target as Node)){setActiveStep(null);setShowProductSuggestions(false)}}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[searchStarted]);
  useEffect(()=>{const q=query.trim();if(!q){setProductSuggestions([]);return}const controller=new AbortController(),timer=window.setTimeout(async()=>{try{const response=await fetch(`/api/product-suggestions?q=${encodeURIComponent(q)}`,{signal:controller.signal}),data=await response.json() as {results?:ProductSuggestion[]};setProductSuggestions(data.results??[])}catch{}},180);return()=>{window.clearTimeout(timer);controller.abort()}},[query]);
  const today=isoDate(new Date()),baseMonth=useMemo(()=>{const source=initialFrom?new Date(`${initialFrom}T12:00:00`):new Date();return new Date(source.getFullYear(),source.getMonth(),1)},[initialFrom]),months=useMemo(()=>Array.from({length:12},(_,i)=>new Date(baseMonth.getFullYear(),baseMonth.getMonth()+i,1)),[baseMonth]),weekdays=en?['M','T','W','T','F','S','S']:['M','T','O','T','F','L','S'],hasActiveFilters=Boolean(query||from||to||category);
  function rememberSearch(){try{const normalized={q:query.trim(),from,to:to||from,place:initialPlace.trim(),radius:initialRadius||'10',nearby:Boolean(initialNearby),ts:Date.now()},key=`${normalized.q}|${normalized.from}|${normalized.to}|${normalized.place}|${normalized.radius}|${normalized.nearby?1:0}`,parsed=JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY)||'[]'),list=Array.isArray(parsed)?parsed:[],next=[normalized,...list.filter(item=>`${item?.q||''}|${item?.from||''}|${item?.to||''}|${item?.place||''}|${item?.radius||'10'}|${item?.nearby?1:0}`!==key)].slice(0,5);window.localStorage.setItem(RECENT_SEARCHES_KEY,JSON.stringify(next));setRecentSearches(next)}catch{}}
  function clearRecentSearches(){try{window.localStorage.removeItem(RECENT_SEARCHES_KEY)}catch{}setRecentSearches([])}
  function navigate(collapse=true){const p=new URLSearchParams();if(query.trim())p.set('q',query.trim());if(category)p.set('category',category);if(from)p.set('from',from);if(to||from)p.set('to',to||from);if(initialPlace.trim())p.set('place',initialPlace.trim());if(initialRadius)p.set('radius',initialRadius);if(initialNearby)p.set('nearby','1');if(collapse){rememberSearch();setActiveStep(null);setExpanded(false);window.scrollTo(0,0)}router.push(`/${locale}/produkter?${p.toString()}`,{scroll:collapse})}
  function resetSearch(){setQuery('');setFrom('');setTo('');setActiveStep(null);setShowProductSuggestions(false);setExpanded(true);setSearchStarted(false);queryInputRef.current?.blur();window.scrollTo({top:0,left:0,behavior:'auto'});window.setTimeout(()=>router.replace(`/${locale}`,{scroll:true}),180)}
  function closeWhat(){setActiveStep(null);setShowProductSuggestions(false);queryInputRef.current?.blur()}
  function handleSubmit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(searchStarted)navigate()}
  function activateWhat(){setSearchStarted(true);setActiveStep('what');setShowProductSuggestions(true)}
  function openCalendar(){setSearchStarted(true);setActiveStep('when');setShowProductSuggestions(false);requestAnimationFrame(()=>calendarScrollRef.current?.scrollTo({top:0,behavior:'smooth'}))}
  function queryKeyDown(event:KeyboardEvent<HTMLInputElement>){if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();openCalendar()}}
  function pickProduct(label:string){setQuery(label);openCalendar()}
  function pickRecent(item:RecentSearch){setQuery(item.q||'');setFrom(item.from||'');setTo(item.to||'');openCalendar()}
  function nextFromCalendar(){if(!from)return;if(!to)setTo(from);window.setTimeout(()=>navigate(),0)}
  function chooseDate(value:string){if(value<today)return;if(!from||to){setFrom(value);setTo('')}else if(value<from){setFrom(value);setTo('')}else setTo(value)}
  const dateLabel=from?(to?`${compactDate(from,en)} – ${compactDate(to,en)}`:compactDate(from,en)):(en?'When do you need it?':'När behöver du det?'),whatLabel=query||(en?'All products':'Alla produkter'),recentMeta=(item:RecentSearch)=>item.from?(item.to&&item.to!==item.from?`${compactDate(item.from,en)} – ${compactDate(item.to,en)}`:compactDate(item.from,en)):'';
  if(!expanded)return <button type="button" className="rentalSearchCompact2" onClick={()=>{setExpanded(true);setSearchStarted(true)}} aria-label={en?'Edit search':'Ändra sökning'}><SearchIcon/><span><b>{whatLabel}</b><small>{dateLabel}</small></span><span className="rentalSearchEdit2">☰</span></button>;
  return <form ref={formRef} onSubmit={handleSubmit} className={`rentalSearchFlow2 ${activeStep==='when'?'calendarIsOpen':''}`}>
    <div className={`rentalSearchSection2 whatSection2 ${activeStep==='what'?'active':''}`}><label className="rentalSearchField2 rentalWhatField2"><button type="button" className="rentalLeadingIcon2" onPointerDown={e=>e.preventDefault()} onClick={()=>activeStep==='what'?closeWhat():activateWhat()} aria-label={activeStep==='what'?(en?'Back':'Tillbaka'):(en?'Search':'Sök')}>{activeStep==='what'?<BackIcon/>:<SearchIcon/>}</button><span>{activeStep==='what'&&<b>{en?'What':'Vad'}</b>}<input ref={queryInputRef} value={query} onFocus={activateWhat} onChange={e=>{setQuery(e.target.value);setShowProductSuggestions(true)}} onKeyDown={queryKeyDown} enterKeyHint="next" autoComplete="off" placeholder={activeStep==='what'?(en?'Search rental items':'Sök hyresobjekt'):(en?'Start your search':'Påbörja din sökning')}/></span></label>{activeStep==='what'&&showProductSuggestions&&<div className="searchSuggestMenu2 whatSuggestMenu2" role="listbox">{query.trim()&&productSuggestions.map(item=><button type="button" className="searchSuggestItem2" key={`${item.kind}-${item.label}`} onPointerDown={e=>e.preventDefault()} onClick={()=>pickProduct(item.label)}><span>{item.label}</span><small>{item.kind==='product'?(en?'product':'produkt'):item.kind==='category'?(en?'category':'kategori'):(en?'type':'typ')}</small></button>)}{!query.trim()&&recentSearches.length>0&&<><div className="searchSuggestHeading2 searchSuggestHeadingWithAction2"><span>{en?'Recent searches':'Senaste sökningar'}</span><button type="button" onPointerDown={e=>e.preventDefault()} onClick={clearRecentSearches}>{en?'Clear':'Rensa'}</button></div>{recentSearches.map((item,index)=><button type="button" className="searchSuggestItem2 recentSuggestItem2" key={`${item.ts||index}-${item.q||''}`} onPointerDown={e=>e.preventDefault()} onClick={()=>pickRecent(item)}><span><b>{item.q||(en?'All products':'Alla produkter')}</b>{recentMeta(item)&&<small>{recentMeta(item)}</small>}</span><SearchIcon/></button>)}</>}</div>}</div>
    {searchStarted&&<><div className="rentalWhenWrap2"><button type="button" className={`rentalSearchRow2 ${activeStep==='when'?'active':''}`} onClick={openCalendar}><span><b>{en?'When':'När'}</b><small>{dateLabel}</small></span><span className="rentalPlus2">＋</span></button>{activeStep==='when'&&<div className="rentalCalendar2 rentalCalendarOverlay2"><div className="rentalCalendarScroll2" ref={calendarScrollRef}>{months.map((month,monthIndex)=>{const label=new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{month:'long',year:'numeric'}).format(month),cells=monthCells(month);return <section className="rentalCalendarMonth2" key={`${month.getFullYear()}-${month.getMonth()}`}><strong className="rentalCalendarMonthTitle2">{label}</strong>{monthIndex===0&&<div className="rentalWeekdays2">{weekdays.map((d,i)=><span key={`${d}-${i}`}>{d}</span>)}</div>}<div className="rentalCalendarGrid2">{cells.map((date,i)=>{if(!date)return <span key={`blank-${monthIndex}-${i}`}/>;const value=isoDate(date),disabled=value<today,start=value===from,end=value===to,hasRange=Boolean(from&&to&&from!==to),inRange=Boolean(from&&to&&value>from&&value<to),classes=[start||end?'selected':'',inRange?'inRange':'',start&&hasRange?'rangeStart':'',end&&hasRange?'rangeEnd':''].filter(Boolean).join(' ');return <button type="button" key={value} disabled={disabled} className={classes} onClick={()=>chooseDate(value)}>{date.getDate()}</button>})}</div></section>})}</div><div className="rentalCalendarFooter2"><button type="button" className="clear" onClick={()=>{setFrom('');setTo('')}}>{en?'Clear':'Rensa'}</button><button type="button" className="done" disabled={!from} onClick={nextFromCalendar}>{en?'Search':'Sök'}</button></div></div>}</div><div className="rentalSearchActions2">{hasActiveFilters&&<button type="button" className="rentalSearchReset2" onClick={resetSearch}>{en?'Clear filters':'Rensa filter'}</button>}<button type="submit" className="rentalSearchSubmit2"><SearchIcon/>{en?'Search':'Sök'}</button></div></>}
  </form>;
}
