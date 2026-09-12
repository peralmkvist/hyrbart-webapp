'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ForwardIcon, ListIcon, ListingsIcon } from './Icons';
import CalendarTodayJump from './CalendarTodayJump';

type ProductOption = { id: string; label: string };
type BookingStatus = 'requested'|'reserved'|'accepted'|'paid'|'active'|'returned';
type Block = {
  id: string;
  productId: string;
  from: string;
  to: string;
  status: 'blocked'|'reserved'|'booked'|'service';
  note?: string;
  bookingStatus?: BookingStatus;
  renterName?: string;
};
type PricingProduct = ProductOption & { dailyPrice?:number; multiDayDiscountPercent?:number; weeklyDiscountPercent?:number; repeatCustomerDiscountPercent?:number };
type ListFilter = 'all'|'action'|'upcoming'|'active'|'completed';

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

export default function HostCalendar({ locale }: { locale: string }) {
  const en = locale === 'en';
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayMonth = useMemo(() => startOfMonth(today), [today]);
  const todayIso = iso(today);
  const [view, setView] = useState<'month' | 'list'>('list');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filterProduct, setFilterProduct] = useState('all');
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [selection, setSelection] = useState<{from:string;to:string}|null>(null);
  const [draftStart, setDraftStart] = useState<string|null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [blockProduct, setBlockProduct] = useState('');
  const [status, setStatus] = useState<'blocked'|'service'>('blocked');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [actioningId, setActioningId] = useState<string|null>(null);
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
    const response = await fetch('/api/availability', { cache:'no-store' });
    if (!response.ok) return;
    const data = await response.json() as { products?:ProductOption[]; blocks?:Block[] };
    setProducts(data.products ?? []);
    setBlocks(data.blocks ?? []);
    setBlockProduct(current => current || data.products?.[0]?.id || '');
  }

  async function loadPricing() {
    const response = await fetch('/api/pricing', { cache:'no-store' });
    if (!response.ok) return;
    const data = await response.json() as { products?:PricingProduct[] };
    const next = data.products ?? [];
    setPricingProducts(next);
    setPricingProductId(current => current || next[0]?.id || '');
  }

  useEffect(() => { void loadAvailability(); void loadPricing(); }, []);
  useEffect(() => {
    const selected = pricingProducts.find(product => product.id === pricingProductId);
    if (!selected) return;
    setDailyPrice(selected.dailyPrice != null ? String(selected.dailyPrice) : '');
    setMultiDiscount(selected.multiDayDiscountPercent != null ? String(selected.multiDayDiscountPercent) : '');
    setWeeklyDiscount(selected.weeklyDiscountPercent != null ? String(selected.weeklyDiscountPercent) : '');
    setRepeatDiscount(selected.repeatCustomerDiscountPercent != null ? String(selected.repeatCustomerDiscountPercent) : '');
  }, [pricingProductId, pricingProducts]);

  const weekdayLabels = en ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  const months = useMemo(() => Array.from({length:49}, (_, index) => addMonths(todayMonth,index-24)), [todayMonth]);
  const visibleBlocks = filterProduct === 'all' ? blocks : blocks.filter(block => block.productId === filterProduct);
  const blocksOnDate = (date:string) => visibleBlocks.filter(block => block.from <= date && block.to >= date);
  const inSelection = (date:string) => Boolean(selection && selection.from <= date && selection.to >= date);
  const bookingBlocks = useMemo(() => visibleBlocks.filter(block => Boolean(block.bookingStatus)), [visibleBlocks]);
  const allBookingBlocks = useMemo(() => blocks.filter(block => Boolean(block.bookingStatus)), [blocks]);
  const needsActionCount = allBookingBlocks.filter(block => block.bookingStatus === 'requested' || block.bookingStatus === 'reserved').length;

  const groupedBookings = useMemo(() => {
    const sorted = [...bookingBlocks].sort((a,b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
    return {
      action: sorted.filter(block => block.bookingStatus === 'requested' || block.bookingStatus === 'reserved'),
      upcoming: sorted.filter(block => (block.bookingStatus === 'accepted' || block.bookingStatus === 'paid') && block.to >= todayIso),
      active: sorted.filter(block => block.bookingStatus === 'active'),
      completed: sorted.filter(block => block.bookingStatus === 'returned').reverse(),
    };
  }, [bookingBlocks, todayIso]);

  const visibleGroups = useMemo(() => {
    const groups = [
      { key:'action' as const, title:en?'Needs action':'Behöver åtgärd', items:groupedBookings.action },
      { key:'upcoming' as const, title:en?'Upcoming':'Kommande', items:groupedBookings.upcoming },
      { key:'active' as const, title:en?'Active':'Pågående', items:groupedBookings.active },
      { key:'completed' as const, title:en?'Completed':'Avslutade', items:groupedBookings.completed },
    ];
    return listFilter === 'all' ? groups : groups.filter(group => group.key === listFilter);
  }, [en, groupedBookings, listFilter]);

  function selectDate(date:string) {
    setMessage('');
    if (!draftStart || selection) { setDraftStart(date); setSelection({from:date,to:date}); return; }
    const from = draftStart <= date ? draftStart : date;
    const to = draftStart <= date ? date : draftStart;
    setSelection({from,to});
    setDraftStart(null);
  }

  function openBooking(block:Block) { router.push(`/${locale}/vard/bokningar/${block.id}`); }

  async function updateBooking(block:Block, nextStatus:'accepted'|'declined') {
    setActioningId(block.id);
    setMessage('');
    try {
      const response = await fetch(`/api/bookings/${block.id}/status`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status:nextStatus}),
      });
      const data = await response.json() as { error?:string };
      if (!response.ok) throw new Error(data.error || (en?'Could not update booking.':'Kunde inte uppdatera bokningen.'));
      await loadAvailability();
      setMessage(nextStatus === 'accepted' ? (en?'Booking approved.':'Bokningen är godkänd.') : (en?'Booking declined.':'Bokningen är nekad.'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (en?'Could not update booking.':'Kunde inte uppdatera bokningen.'));
    } finally {
      setActioningId(null);
    }
  }

  async function saveBlock() {
    if (!selection || !blockProduct) return;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/availability', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({productId:blockProduct,from:selection.from,to:selection.to,status,note}) });
      const data = await response.json() as { error?:string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte spara');
      await loadAvailability(); setModalOpen(false); setSelection(null); setDraftStart(null); setNote('');
      setMessage(en?'Dates blocked.':'Datumen är blockerade.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (en?'Could not save.':'Kunde inte spara.'));
    } finally { setSaving(false); }
  }

  async function savePricing() {
    if (!pricingProductId) return;
    setPricingSaving(true); setPricingMessage('');
    try {
      const response = await fetch('/api/pricing', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({productId:pricingProductId,dailyPrice:Number(dailyPrice||0),multiDayDiscountPercent:Number(multiDiscount||0),weeklyDiscountPercent:Number(weeklyDiscount||0),repeatCustomerDiscountPercent:Number(repeatDiscount||0)}) });
      const data = await response.json() as { error?:string };
      if (!response.ok) throw new Error(data.error || (en?'Could not save pricing.':'Kunde inte spara prissättningen.'));
      await loadPricing(); setPricingMessage(en?'Pricing saved.':'Prisinställningarna är sparade.');
    } catch (error) {
      setPricingMessage(error instanceof Error ? error.message : (en?'Could not save pricing.':'Kunde inte spara prissättningen.'));
    } finally { setPricingSaving(false); }
  }

  const bookingStatusLabel = (block:Block) => {
    switch (block.bookingStatus) {
      case 'requested': return en?'Request':'Förfrågan';
      case 'reserved': return en?'Reserved':'Reserverad';
      case 'accepted': return en?'Approved':'Godkänd';
      case 'paid': return en?'Paid':'Betald';
      case 'active': return en?'Active':'Pågående';
      case 'returned': return en?'Returned':'Återlämnad';
      default: return block.status === 'booked' ? (en?'Booked':'Bokad') : (en?'Reserved':'Reserverad');
    }
  };

  return <section className="hostCalendarPage">
    <div className="hostCalendarTop">
      <div className="hostCalendarTopActions">
        <button type="button" className="hostCalendarToday" onClick={()=>setPricingOpen(true)}>{en?'Price & discounts':'Pris & rabatter'}</button>
        <div className="hostCalendarViewPicker">
          <button type="button" className="hostCalendarViewButton" aria-expanded={viewMenuOpen} onClick={()=>setViewMenuOpen(value=>!value)}>
            {view==='month'?<ListingsIcon/>:<ListIcon/>}
            {needsActionCount > 0 && <span className="hostCalendarActionBadge" aria-label={`${needsActionCount} ${en?'items need action':'ärenden behöver åtgärd'}`}>{needsActionCount}</span>}
          </button>
          {viewMenuOpen && <div className="hostCalendarViewMenu" role="menu">
            <button type="button" className={view==='list'?'active':''} onClick={()=>{setView('list');setViewMenuOpen(false)}}><span>{en?'List':'Lista'}</span><ListIcon/></button>
            <button type="button" className={view==='month'?'active':''} onClick={()=>{setView('month');setViewMenuOpen(false)}}><span>{en?'Calendar':'Kalender'}</span><ListingsIcon/></button>
          </div>}
        </div>
      </div>
    </div>

    <div className="hostCalendarToolbar"><div><strong>{view==='list'?(en?'Bookings':'Bokningar'):(en?'Booking calendar':'Bokningskalender')}</strong></div></div>
    <label className="hostListingFilter" style={{cursor:'default'}}><select value={filterProduct} onChange={event=>setFilterProduct(event.target.value)} style={{border:0,background:'transparent',width:'100%',font:'inherit',fontWeight:700,color:'inherit',outline:0}}><option value="all">{en?'All listings':'Alla annonser'}</option>{products.map(product=><option key={product.id} value={product.id}>{product.label}</option>)}</select><ForwardIcon/></label>

    {view === 'list' && <div className="hostBookingFilterRail" role="tablist" aria-label={en?'Filter bookings':'Filtrera bokningar'}>
      {([
        ['all', en?'All':'Alla'],
        ['action', en?'Needs action':'Behöver åtgärd'],
        ['upcoming', en?'Upcoming':'Kommande'],
        ['active', en?'Active':'Pågående'],
        ['completed', en?'Completed':'Avslutade'],
      ] as Array<[ListFilter,string]>).map(([key,label])=><button key={key} type="button" className={listFilter===key?'active':''} onClick={()=>setListFilter(key)}>{label}{key==='action'&&needsActionCount>0?<span>{needsActionCount}</span>:null}</button>)}
    </div>}

    {view==='month' ? <>
      <div className="hostCalendarMonthsScroll">{months.map(calendarMonth=>{const monthLabel=new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{month:'long',year:'numeric'}).format(calendarMonth);const cells=monthDays(calendarMonth);const currentMonth=calendarMonth.getFullYear()===todayMonth.getFullYear()&&calendarMonth.getMonth()===todayMonth.getMonth();return <section className="hostCalendarMonthSection" data-current-month={currentMonth?'true':undefined} key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`}><strong className="hostCalendarMonthTitle">{monthLabel}</strong><div className="hostCalendarCard hostCalendarStackedCard"><div className="hostCalendarWeekdays">{weekdayLabels.map(label=><span key={label}>{label}</span>)}</div><div className="hostCalendarGrid hostCalendarStackedGrid">{cells.map((date,index)=>{if(!date)return <span className="hostCalendarBlankDay" key={`blank-${index}`}/>;const dateIso=iso(date),dayBlocks=blocksOnDate(dateIso),selected=inSelection(dateIso),booking=dayBlocks.find(block=>block.status==='booked'||block.status==='reserved'),cls=`hostCalendarDay ${dateIso===todayIso?'today ':''}${selected?'selected ':''}${dayBlocks.length?'blocked ':''}`;return <button type="button" key={dateIso} className={cls} onClick={()=>booking?openBooking(booking):selectDate(dateIso)} aria-label={booking?(en?'Open booking':'Öppna bokning'):dateIso} style={selected?{background:'var(--accent)',color:'var(--ink)'}:dayBlocks.length?{background:'#f0f0ed'}:undefined}><span>{date.getDate()}</span>{dayBlocks.length>0&&dateIso!==todayIso&&<i style={{width:6,height:6,borderRadius:'50%',background:dayBlocks.some(block=>block.status==='booked')?'var(--accent)':dayBlocks.some(block=>block.status==='reserved')?'#111':'#777',position:'absolute',bottom:5}}/>}</button>})}</div></div></section>})}</div>
      <div className="hostCalendarLegend"><span><i className="available"/>{en?'Available':'Tillgänglig'}</span><span><i className="blocked"/>{en?'Blocked':'Blockerad'}</span><span><i className="booked"/>{en?'Booked / reserved':'Bokad / reserverad'}</span></div>
      <CalendarTodayJump active={view==='month'} />
    </> : <div className="hostCalendarList">
      {visibleGroups.some(group=>group.items.length>0) ? visibleGroups.map(group=>group.items.length>0 && <section className={`hostBookingSection hostBookingSection-${group.key}`} key={group.key}>
        <div className="hostBookingSectionTitle"><strong>{group.title}</strong><span>{group.items.length}</span></div>
        <div className="hostBookingCards">{group.items.map(block=>{
          const product = products.find(item=>item.id===block.productId)?.label || (en?'Listing':'Annons');
          const actionable = block.bookingStatus === 'requested' || block.bookingStatus === 'reserved';
          return <article className={`hostBookingCard ${actionable?'needsAction':''}`} key={block.id} onClick={()=>openBooking(block)}>
            <div className="hostBookingCardTop"><div><span className="hostBookingStatus">{bookingStatusLabel(block)}</span><h3>{product}</h3></div><ForwardIcon/></div>
            <div className="hostBookingMeta"><strong>{block.renterName || (en?'Renter':'Hyrestagare')}</strong><span>{block.from}{block.to!==block.from?` – ${block.to}`:''}</span></div>
            <div className="hostBookingCardActions">
              {actionable && <><button type="button" disabled={actioningId===block.id} className="approve" onClick={event=>{event.stopPropagation();void updateBooking(block,'accepted')}}>{en?'Approve':'Godkänn'}</button><button type="button" disabled={actioningId===block.id} className="decline" onClick={event=>{event.stopPropagation();void updateBooking(block,'declined')}}>{en?'Decline':'Neka'}</button></>}
              <button type="button" className="message" onClick={event=>{event.stopPropagation();openBooking(block)}}>{en?'Message':'Meddelande'}</button>
            </div>
          </article>;
        })}</div>
      </section>) : <div className="hostCalendarListEmpty"><ListIcon/><strong>{en?'No bookings here':'Inga bokningar här'}</strong><span>{en?'Bookings will appear here when they are created.':'Bokningar visas här när de skapas.'}</span></div>}
    </div>}

    {selection&&view==='month'&&<div style={{position:'sticky',bottom:'calc(var(--nav-h) + 18px)',zIndex:25,display:'flex',gap:10,marginTop:18}}><button type="button" onClick={()=>{setSelection(null);setDraftStart(null)}} style={{flex:1,minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Clear':'Rensa'}</button><button type="button" onClick={()=>setModalOpen(true)} style={{flex:2,minHeight:52,border:0,borderRadius:16,background:'var(--accent)',color:'var(--ink)',fontWeight:850}}>{en?'Block selected dates':'Blockera valda datum'}</button></div>}
    {message&&<p className="hostCalendarFeedback">{message}</p>}

    {modalOpen&&selection&&<div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.34)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setModalOpen(false)}><div style={{width:'min(100%,560px)',background:'#fff',borderRadius:'24px 24px 0 0',padding:'24px 20px calc(24px + env(safe-area-inset-bottom))',boxShadow:'0 -10px 40px rgba(0,0,0,.18)'}} onClick={event=>event.stopPropagation()}><h2 style={{margin:'0 0 6px',fontSize:'1.45rem'}}>{en?'Block availability':'Blockera tillgänglighet'}</h2><p style={{margin:'0 0 20px',color:'var(--muted)'}}>{selection.from===selection.to?selection.from:`${selection.from} – ${selection.to}`}</p><label style={{display:'grid',gap:7,marginBottom:16,fontWeight:750}}>{en?'Listing':'Annons'}<select value={blockProduct} onChange={event=>setBlockProduct(event.target.value)} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff',font:'inherit'}}>{products.map(product=><option key={product.id} value={product.id}>{product.label}</option>)}</select></label><label style={{display:'grid',gap:7,marginBottom:16,fontWeight:750}}>{en?'Reason':'Orsak'}<select value={status} onChange={event=>setStatus(event.target.value as 'blocked'|'service')} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff',font:'inherit'}}><option value="blocked">{en?'Blocked by host':'Blockerad av uthyrare'}</option><option value="service">{en?'Service / maintenance':'Service / underhåll'}</option></select></label><label style={{display:'grid',gap:7,marginBottom:20,fontWeight:750}}>{en?'Note (optional)':'Notering (valfritt)'}<input value={note} onChange={event=>setNote(event.target.value)} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',font:'inherit'}}/></label><div style={{display:'flex',gap:10}}><button type="button" onClick={()=>setModalOpen(false)} style={{flex:1,minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Cancel':'Avbryt'}</button><button type="button" disabled={saving} onClick={saveBlock} style={{flex:2,minHeight:52,border:0,borderRadius:16,background:'var(--accent)',fontWeight:850}}>{saving?(en?'Saving…':'Sparar…'):(en?'Save':'Spara')}</button></div></div></div>}

    {pricingOpen&&<div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.34)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setPricingOpen(false)}><div style={{width:'min(100%,560px)',background:'#fff',borderRadius:'24px 24px 0 0',padding:'24px 20px calc(24px + env(safe-area-inset-bottom))',boxShadow:'0 -10px 40px rgba(0,0,0,.18)'}} onClick={event=>event.stopPropagation()}><h2 style={{margin:'0 0 6px',fontSize:'1.45rem'}}>{en?'Price & discounts':'Pris & rabatter'}</h2><p style={{margin:'0 0 18px',color:'var(--muted)'}}>{en?'Set the base daily price and optional discounts for each listing.':'Ställ in grundpris per dygn och valfria rabatter för varje annons.'}</p><label className="calendarPricingField2">{en?'Listing':'Annons'}<select value={pricingProductId} onChange={event=>setPricingProductId(event.target.value)}>{pricingProducts.map(product=><option key={product.id} value={product.id}>{product.label}</option>)}</select></label><label className="calendarPricingField2">{en?'Daily price':'Dygnspris'}<div><input inputMode="numeric" value={dailyPrice} onChange={event=>setDailyPrice(event.target.value)}/><span>kr</span></div></label><label className="calendarPricingField2">{en?'Multi-day discount':'Flerdagsrabatt'}<div><input inputMode="numeric" value={multiDiscount} onChange={event=>setMultiDiscount(event.target.value)}/><span>%</span></div></label><label className="calendarPricingField2">{en?'Weekly discount':'Veckorabatt'}<div><input inputMode="numeric" value={weeklyDiscount} onChange={event=>setWeeklyDiscount(event.target.value)}/><span>%</span></div></label><label className="calendarPricingField2">{en?'Repeat customer discount':'Återkommande kund'}<div><input inputMode="numeric" value={repeatDiscount} onChange={event=>setRepeatDiscount(event.target.value)}/><span>%</span></div></label>{pricingMessage&&<p style={{fontWeight:700,margin:'14px 0 0'}}>{pricingMessage}</p>}<div style={{display:'flex',gap:10,marginTop:20}}><button type="button" onClick={()=>setPricingOpen(false)} style={{flex:1,minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Close':'Stäng'}</button><button type="button" disabled={pricingSaving} onClick={savePricing} style={{flex:2,minHeight:52,border:0,borderRadius:16,background:'var(--accent)',fontWeight:850}}>{pricingSaving?(en?'Saving…':'Sparar…'):(en?'Save':'Spara')}</button></div></div></div>}
  </section>;
}
