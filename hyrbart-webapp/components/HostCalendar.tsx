'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ForwardIcon, ListIcon, ListingsIcon } from './Icons';

type ProductOption = { id: string; label: string };
type Block = { id: string; productId: string; from: string; to: string; status: 'blocked'|'reserved'|'booked'|'service'; note?: string };
type PricingProduct = ProductOption & { dailyPrice?:number; multiDayDiscountPercent?:number; weeklyDiscountPercent?:number; repeatCustomerDiscountPercent?:number };

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addMonths(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function monthDays(month: Date) {
  const firstDay = month.getDay() === 0 ? 6 : month.getDay() - 1;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  return Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });
}

const DEMO_BOOKING: Block = { id:'demo-booking', productId:'__demo__', from:'2026-09-22', to:'2026-09-24', status:'booked', note:'Anna Lindberg' };

export default function HostCalendar({ locale }: { locale: string }) {
  const en = locale === 'en';
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayIso = iso(today);
  const [month, setMonth] = useState(startOfMonth(today));
  const [view, setView] = useState<'month' | 'list'>('month');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filterProduct, setFilterProduct] = useState('all');
  const [selection, setSelection] = useState<{from:string;to:string}|null>(null);
  const [draftStart, setDraftStart] = useState<string|null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [blockProduct, setBlockProduct] = useState('');
  const [status, setStatus] = useState<'blocked'|'service'>('blocked');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingProducts, setPricingProducts] = useState<PricingProduct[]>([]);
  const [pricingProductId, setPricingProductId] = useState('');
  const [dailyPrice, setDailyPrice] = useState('');
  const [multiDiscount, setMultiDiscount] = useState('');
  const [weeklyDiscount, setWeeklyDiscount] = useState('');
  const [repeatDiscount, setRepeatDiscount] = useState('');
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMessage, setPricingMessage] = useState('');

  async function loadAvailability() {
    const response=await fetch('/api/availability',{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json() as {products?:ProductOption[];blocks?:Block[]};
    setProducts(data.products??[]); setBlocks(data.blocks??[]); setBlockProduct(c=>c||data.products?.[0]?.id||'');
  }
  async function loadPricing() {
    const response=await fetch('/api/pricing',{cache:'no-store'}); if(!response.ok)return;
    const data=await response.json() as {products?:PricingProduct[]}; const next=data.products??[];
    setPricingProducts(next); setPricingProductId(c=>c||next[0]?.id||'');
  }
  useEffect(()=>{void loadAvailability();void loadPricing()},[]);
  useEffect(()=>{const selected=pricingProducts.find(p=>p.id===pricingProductId);if(!selected)return;setDailyPrice(selected.dailyPrice!=null?String(selected.dailyPrice):'');setMultiDiscount(selected.multiDayDiscountPercent!=null?String(selected.multiDayDiscountPercent):'');setWeeklyDiscount(selected.weeklyDiscountPercent!=null?String(selected.weeklyDiscountPercent):'');setRepeatDiscount(selected.repeatCustomerDiscountPercent!=null?String(selected.repeatCustomerDiscountPercent):'')},[pricingProductId,pricingProducts]);

  const weekdayLabels=en?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  const months=useMemo(()=>Array.from({length:12},(_,i)=>addMonths(month,i)),[month]);
  const allBlocks=useMemo(()=>blocks.some(b=>b.id===DEMO_BOOKING.id)?blocks:[...blocks,DEMO_BOOKING],[blocks]);
  const visibleBlocks=filterProduct==='all'?allBlocks:allBlocks.filter(b=>b.productId===filterProduct);
  const blocksOnDate=(date:string)=>visibleBlocks.filter(b=>b.from<=date&&b.to>=date);
  const inSelection=(date:string)=>Boolean(selection&&selection.from<=date&&selection.to>=date);
  const upcomingBookings=useMemo(()=>visibleBlocks.filter(b=>b.to>=todayIso&&(b.status==='booked'||b.status==='reserved')).sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to)),[visibleBlocks,todayIso]);
  function selectDate(date:string){setMessage('');if(!draftStart||selection){setDraftStart(date);setSelection({from:date,to:date});return}const from=draftStart<=date?draftStart:date;const to=draftStart<=date?date:draftStart;setSelection({from,to});setDraftStart(null)}
  function openBooking(block:Block){if(block.id===DEMO_BOOKING.id)router.push(`/${locale}/vard/bokningar/demo`)}
  function goToToday(){setMonth(startOfMonth(today));setView('month');setViewMenuOpen(false);setSelection(null);setDraftStart(null);requestAnimationFrame(()=>{document.querySelector<HTMLElement>('.hostCalendarPage:not(.renterCalendarPage) .hostCalendarMonthsScroll')?.scrollTo({top:0,behavior:'smooth'});window.scrollTo({top:0,behavior:'smooth'})})}

  async function saveBlock(){if(!selection||!blockProduct)return;setSaving(true);setMessage('');try{const response=await fetch('/api/availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:blockProduct,from:selection.from,to:selection.to,status,note})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Kunde inte spara');await loadAvailability();setModalOpen(false);setSelection(null);setDraftStart(null);setNote('');setMessage(en?'Dates blocked.':'Datumen är blockerade.')}catch(error){setMessage(error instanceof Error?error.message:(en?'Could not save.':'Kunde inte spara.'))}finally{setSaving(false)}}
  async function savePricing(){if(!pricingProductId)return;setPricingSaving(true);setPricingMessage('');try{const response=await fetch('/api/pricing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:pricingProductId,dailyPrice:Number(dailyPrice||0),multiDayDiscountPercent:Number(multiDiscount||0),weeklyDiscountPercent:Number(weeklyDiscount||0),repeatCustomerDiscountPercent:Number(repeatDiscount||0)})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||(en?'Could not save pricing.':'Kunde inte spara prissättningen.'));await loadPricing();setPricingMessage(en?'Pricing saved.':'Prisinställningarna är sparade.')}catch(error){setPricingMessage(error instanceof Error?error.message:(en?'Could not save pricing.':'Kunde inte spara prissättningen.'))}finally{setPricingSaving(false)}}
  const statusLabel=(block:Block)=>block.status==='booked'?(en?'Booked':'Bokad'):block.status==='reserved'?(en?'Reserved':'Reserverad'):block.status==='service'?'Service':(en?'Blocked':'Blockerad');

  return <section className="hostCalendarPage">
    <div className="hostCalendarTop"><div className="hostCalendarTopActions"><button type="button" className="hostCalendarToday" onClick={goToToday}>{en?'Today':'Idag'}</button><button type="button" className="hostCalendarToday" onClick={()=>setPricingOpen(true)}>{en?'Price & discounts':'Pris & rabatter'}</button><div className="hostCalendarViewPicker"><button type="button" className="hostCalendarViewButton" aria-expanded={viewMenuOpen} onClick={()=>setViewMenuOpen(v=>!v)}>{view==='month'?<ListingsIcon/>:<ListIcon/>}</button>{viewMenuOpen&&<div className="hostCalendarViewMenu" role="menu"><button type="button" className={view==='list'?'active':''} onClick={()=>{setView('list');setViewMenuOpen(false)}}><span>{en?'List':'Lista'}</span><ListIcon/></button><button type="button" className={view==='month'?'active':''} onClick={()=>{setView('month');setViewMenuOpen(false)}}><span>{en?'Calendar':'Kalender'}</span><ListingsIcon/></button></div>}</div></div></div>
    <div className="hostCalendarToolbar"><div><strong>{en?'Booking calendar':'Bokningskalender'}</strong></div></div>
    <label className="hostListingFilter" style={{cursor:'default'}}><select value={filterProduct} onChange={e=>setFilterProduct(e.target.value)} style={{border:0,background:'transparent',width:'100%',font:'inherit',fontWeight:700,color:'inherit',outline:0}}><option value="all">{en?'All listings':'Alla annonser'}</option>{products.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select><ForwardIcon/></label>

    {view==='month'?<><div className="hostCalendarMonthsScroll">{months.map(calendarMonth=>{const monthLabel=new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{month:'long',year:'numeric'}).format(calendarMonth);const cells=monthDays(calendarMonth);return <section className="hostCalendarMonthSection" key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`}><strong className="hostCalendarMonthTitle">{monthLabel}</strong><div className="hostCalendarCard hostCalendarStackedCard"><div className="hostCalendarWeekdays">{weekdayLabels.map(label=><span key={label}>{label}</span>)}</div><div className="hostCalendarGrid hostCalendarStackedGrid">{cells.map((date,index)=>{if(!date)return <span className="hostCalendarBlankDay" key={`blank-${index}`}/>;const dateIso=iso(date),dayBlocks=blocksOnDate(dateIso),selected=inSelection(dateIso),demo=dayBlocks.find(b=>b.id===DEMO_BOOKING.id),cls=`hostCalendarDay ${dateIso===todayIso?'today ':''}${selected?'selected ':''}${dayBlocks.length?'blocked ':''}`;return <button type="button" key={dateIso} className={cls} onClick={()=>demo?openBooking(demo):selectDate(dateIso)} aria-label={demo?(en?'Open booking with Anna Lindberg':'Öppna bokning med Anna Lindberg'):dateIso} style={selected?{background:'var(--accent)',color:'var(--ink)'}:dayBlocks.length?{background:'#f0f0ed'}:undefined}><span>{date.getDate()}</span>{dayBlocks.length>0&&<i style={{width:6,height:6,borderRadius:'50%',background:demo?'var(--accent)':dayBlocks.some(b=>b.status==='booked')?'#111':dayBlocks.some(b=>b.status==='reserved')?'var(--accent)':'#777',position:'absolute',bottom:5}}/>}</button>})}</div></div></section>})}</div><div className="hostCalendarLegend"><span><i className="available"/>{en?'Available':'Tillgänglig'}</span><span><i className="blocked"/>{en?'Blocked':'Blockerad'}</span><span><i className="booked"/>{en?'Booked / reserved':'Bokad / reserverad'}</span></div></>:<div className="hostCalendarList">{upcomingBookings.length?upcomingBookings.map(block=><button type="button" onClick={()=>openBooking(block)} key={block.id} style={{display:'block',width:'100%',padding:'14px 4px',border:0,borderBottom:'1px solid var(--line)',background:'transparent',color:'inherit',textAlign:'left',font:'inherit',cursor:block.id===DEMO_BOOKING.id?'pointer':'default'}}><strong>{block.id===DEMO_BOOKING.id?(en?'Bosch GKS 18V-57 G · Anna Lindberg':'Bosch GKS 18V-57 G · Anna Lindberg'):(products.find(p=>p.id===block.productId)?.label||'Annons')}</strong><div style={{color:'var(--muted)',marginTop:4}}>{block.from}{block.to!==block.from?` – ${block.to}`:''} · {statusLabel(block)}</div></button>):<div className="hostCalendarListEmpty"><ListIcon/><strong>{en?'No upcoming bookings':'Inga kommande bokningar'}</strong></div>}</div>}

    {selection&&view==='month'&&<div style={{position:'sticky',bottom:'calc(var(--nav-h) + 18px)',zIndex:25,display:'flex',gap:10,marginTop:18}}><button type="button" onClick={()=>{setSelection(null);setDraftStart(null)}} style={{flex:1,minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Clear':'Rensa'}</button><button type="button" onClick={()=>setModalOpen(true)} style={{flex:2,minHeight:52,border:0,borderRadius:16,background:'var(--accent)',color:'var(--ink)',fontWeight:850}}>{en?'Block selected dates':'Blockera valda datum'}</button></div>}
    {message&&<p style={{textAlign:'center',fontWeight:700,marginTop:14}}>{message}</p>}
    {modalOpen&&selection&&<div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.34)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setModalOpen(false)}><div style={{width:'min(100%,560px)',background:'#fff',borderRadius:'24px 24px 0 0',padding:'24px 20px calc(24px + env(safe-area-inset-bottom))',boxShadow:'0 -10px 40px rgba(0,0,0,.18)'}} onClick={e=>e.stopPropagation()}><h2 style={{margin:'0 0 6px',fontSize:'1.45rem'}}>{en?'Block availability':'Blockera tillgänglighet'}</h2><p style={{margin:'0 0 20px',color:'var(--muted)'}}>{selection.from===selection.to?selection.from:`${selection.from} – ${selection.to}`}</p><label style={{display:'grid',gap:7,marginBottom:16,fontWeight:750}}>{en?'Listing':'Annons'}<select value={blockProduct} onChange={e=>setBlockProduct(e.target.value)} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff',font:'inherit'}}>{products.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><label style={{display:'grid',gap:7,marginBottom:16,fontWeight:750}}>{en?'Reason':'Orsak'}<select value={status} onChange={e=>setStatus(e.target.value as 'blocked'|'service')} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff',font:'inherit'}}><option value="blocked">{en?'Blocked by host':'Blockerad av uthyrare'}</option><option value="service">{en?'Service / maintenance':'Service / underhåll'}</option></select></label><label style={{display:'grid',gap:7,marginBottom:20,fontWeight:750}}>{en?'Note (optional)':'Notering (valfritt)'}<input value={note} onChange={e=>setNote(e.target.value)} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',font:'inherit'}}/></label><div style={{display:'flex',gap:10}}><button type="button" onClick={()=>setModalOpen(false)} style={{flex:1,minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Cancel':'Avbryt'}</button><button type="button" disabled={saving} onClick={saveBlock} style={{flex:2,minHeight:52,border:0,borderRadius:16,background:'var(--accent)',fontWeight:850}}>{saving?(en?'Saving…':'Sparar…'):(en?'Save':'Spara')}</button></div></div></div>}
    {pricingOpen&&<div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.34)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setPricingOpen(false)}><div style={{width:'min(100%,560px)',background:'#fff',borderRadius:'24px 24px 0 0',padding:'24px 20px calc(24px + env(safe-area-inset-bottom))',boxShadow:'0 -10px 40px rgba(0,0,0,.18)'}} onClick={e=>e.stopPropagation()}><h2 style={{margin:'0 0 6px',fontSize:'1.45rem'}}>{en?'Price & discounts':'Pris & rabatter'}</h2><p style={{margin:'0 0 18px',color:'var(--muted)'}}>{en?'Set the base daily price and optional discounts for each listing.':'Ställ in grundpris per dygn och valfria rabatter för varje annons.'}</p><label className="calendarPricingField2">{en?'Listing':'Annons'}<select value={pricingProductId} onChange={e=>setPricingProductId(e.target.value)}>{pricingProducts.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><label className="calendarPricingField2">{en?'Daily price':'Dygnspris'}<div><input inputMode="numeric" value={dailyPrice} onChange={e=>setDailyPrice(e.target.value)}/><span>kr</span></div></label><label className="calendarPricingField2">{en?'Multi-day discount':'Flerdagsrabatt'}<div><input inputMode="numeric" value={multiDiscount} onChange={e=>setMultiDiscount(e.target.value)}/><span>%</span></div></label><label className="calendarPricingField2">{en?'Weekly discount':'Veckorabatt'}<div><input inputMode="numeric" value={weeklyDiscount} onChange={e=>setWeeklyDiscount(e.target.value)}/><span>%</span></div></label><label className="calendarPricingField2">{en?'Repeat customer discount':'Återkommande kund'}<div><input inputMode="numeric" value={repeatDiscount} onChange={e=>setRepeatDiscount(e.target.value)}/><span>%</span></div></label>{pricingMessage&&<p style={{fontWeight:700,margin:'14px 0 0'}}>{pricingMessage}</p>}<div style={{display:'flex',gap:10,marginTop:20}}><button type="button" onClick={()=>setPricingOpen(false)} style={{flex:1,minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Close':'Stäng'}</button><button type="button" disabled={pricingSaving} onClick={savePricing} style={{flex:2,minHeight:52,border:0,borderRadius:16,background:'var(--accent)',fontWeight:850}}>{pricingSaving?(en?'Saving…':'Sparar…'):(en?'Save':'Spara')}</button></div></div></div>}
  </section>;
}