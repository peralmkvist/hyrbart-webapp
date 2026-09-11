'use client';

import { useEffect, useMemo, useState } from 'react';
import { BackIcon, ForwardIcon, ListIcon, ListingsIcon } from './Icons';

type ProductOption = { id: string; label: string };
type Block = { id: string; productId: string; from: string; to: string; status: 'blocked'|'booked'|'service'; note?: string };

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addMonths(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function cellDate(month: Date, day: number, monthOffset: number) { return new Date(month.getFullYear(), month.getMonth() + monthOffset, day); }

export default function HostCalendar({ locale }: { locale: string }) {
  const en = locale === 'en';
  const today = useMemo(() => new Date(), []);
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

  async function loadAvailability() {
    const response = await fetch('/api/availability', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json() as { products?: ProductOption[]; blocks?: Block[] };
    setProducts(data.products ?? []);
    setBlocks(data.blocks ?? []);
    setBlockProduct((current) => current || data.products?.[0]?.id || '');
  }

  useEffect(() => { void loadAvailability(); }, []);

  const monthLabel = new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { month: 'long', year: 'numeric' }).format(month);
  const weekdayLabels = en ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  const firstDay = month.getDay() === 0 ? 6 : month.getDay() - 1;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousMonthDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => { const relative = index - firstDay + 1; if (relative < 1) return { day: previousMonthDays + relative, outside: true, monthOffset: -1 }; if (relative > daysInMonth) return { day: relative - daysInMonth, outside: true, monthOffset: 1 }; return { day: relative, outside: false, monthOffset: 0 }; });

  const visibleBlocks = filterProduct === 'all' ? blocks : blocks.filter((block) => block.productId === filterProduct);
  const blocksOnDate = (date:string) => visibleBlocks.filter((block) => block.from <= date && block.to >= date);
  const inSelection = (date:string) => Boolean(selection && selection.from <= date && selection.to >= date);

  function selectDate(date: string) {
    setMessage('');
    if (!draftStart || selection) {
      setDraftStart(date);
      setSelection({ from: date, to: date });
      return;
    }
    const from = draftStart <= date ? draftStart : date;
    const to = draftStart <= date ? date : draftStart;
    setSelection({ from, to });
    setDraftStart(null);
  }

  async function saveBlock() {
    if (!selection || !blockProduct) return;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/availability', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ productId:blockProduct, from:selection.from, to:selection.to, status, note }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Kunde inte spara');
      await loadAvailability();
      setModalOpen(false); setSelection(null); setDraftStart(null); setNote('');
      setMessage(en ? 'Dates blocked.' : 'Datumen är blockerade.');
    } catch (error) { setMessage(error instanceof Error ? error.message : (en ? 'Could not save.' : 'Kunde inte spara.')); }
    finally { setSaving(false); }
  }

  const listBlocks = visibleBlocks.filter((block) => block.to >= iso(month) && block.from <= iso(new Date(month.getFullYear(), month.getMonth()+1, 0)));

  return (
    <section className="hostCalendarPage">
      <div className="hostCalendarTop"><div className="hostCalendarTopActions"><button type="button" className="hostCalendarToday" onClick={() => setMonth(startOfMonth(today))}>{en?'Today':'Idag'}</button><div className="hostCalendarViewPicker"><button type="button" className="hostCalendarViewButton" aria-expanded={viewMenuOpen} onClick={() => setViewMenuOpen(v=>!v)}>{view==='month'?<ListingsIcon/>:<ListIcon/>}</button>{viewMenuOpen&&<div className="hostCalendarViewMenu" role="menu"><button type="button" className={view==='list'?'active':''} onClick={()=>{setView('list');setViewMenuOpen(false)}}><span>{en?'List':'Lista'}</span><ListIcon/></button><button type="button" className={view==='month'?'active':''} onClick={()=>{setView('month');setViewMenuOpen(false)}}><span>{en?'Month':'Månad'}</span><ListingsIcon/></button></div>}</div></div></div>
      <div className="hostCalendarToolbar"><div><span className="hostCalendarEyebrow">{en?'Availability':'Tillgänglighet'}</span><strong>{monthLabel}</strong></div><div className="hostCalendarArrows"><button type="button" onClick={()=>setMonth(m=>addMonths(m,-1))}><BackIcon/></button><button type="button" onClick={()=>setMonth(m=>addMonths(m,1))}><ForwardIcon/></button></div></div>
      <label className="hostListingFilter" style={{cursor:'default'}}><select value={filterProduct} onChange={(e)=>setFilterProduct(e.target.value)} style={{border:0,background:'transparent',width:'100%',font:'inherit',fontWeight:700,color:'inherit',outline:0}}><option value="all">{en?'All listings':'Alla annonser'}</option>{products.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select><ForwardIcon/></label>
      {view==='month' ? <><div className="hostCalendarCard"><div className="hostCalendarWeekdays">{weekdayLabels.map(label=><span key={label}>{label}</span>)}</div><div className="hostCalendarGrid">{cells.map((cell,index)=>{const date=iso(cellDate(month,cell.day,cell.monthOffset));const dayBlocks=blocksOnDate(date);const selected=inSelection(date);const cls=`hostCalendarDay ${cell.outside?'outside ':''}${date===iso(today)?'today ':''}${selected?'selected ':''}${dayBlocks.length?'blocked ':''}`;return <button type="button" key={`${cell.monthOffset}-${cell.day}-${index}`} className={cls} onClick={()=>selectDate(date)} aria-label={date} style={selected?{background:'var(--accent)',color:'var(--ink)'}:dayBlocks.length?{background:'#f0f0ed'}:undefined}><span>{cell.day}</span>{dayBlocks.length>0&&<i style={{width:5,height:5,borderRadius:'50%',background:dayBlocks.some(b=>b.status==='booked')?'#111':'#777',position:'absolute',bottom:5}}/>}</button>})}</div></div><div className="hostCalendarLegend"><span><i className="available"/>{en?'Available':'Tillgänglig'}</span><span><i className="blocked"/>{en?'Blocked':'Blockerad'}</span><span><i className="booked"/>{en?'Booked':'Bokad'}</span></div></> : <div className="hostCalendarList"><div className="hostCalendarListMonth">{monthLabel}</div>{listBlocks.length?listBlocks.map(block=><div key={block.id} style={{padding:'14px 4px',borderBottom:'1px solid var(--line)'}}><strong>{products.find(p=>p.id===block.productId)?.label||'Annons'}</strong><div style={{color:'var(--muted)',marginTop:4}}>{block.from} – {block.to} · {block.status==='booked'?'Bokad':block.status==='service'?'Service':'Blockerad'}</div></div>):<div className="hostCalendarListEmpty"><ListIcon/><strong>{en?'No blocked dates this month':'Inga blockerade datum den här månaden'}</strong></div>}</div>}
      {selection&&view==='month'&&<div style={{position:'sticky',bottom:'calc(var(--nav-h) + 18px)',zIndex:25,display:'flex',gap:10,marginTop:18}}><button type="button" onClick={()=>{setSelection(null);setDraftStart(null)}} style={{flex:1,minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Clear':'Rensa'}</button><button type="button" onClick={()=>setModalOpen(true)} style={{flex:2,minHeight:52,border:0,borderRadius:16,background:'var(--accent)',color:'var(--ink)',fontWeight:850}}>{en?'Block selected dates':'Blockera valda datum'}</button></div>}
      {message&&<p style={{textAlign:'center',fontWeight:700,marginTop:14}}>{message}</p>}
      {modalOpen&&selection&&<div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.34)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setModalOpen(false)}><div style={{width:'min(100%,560px)',background:'#fff',borderRadius:'24px 24px 0 0',padding:'24px 20px calc(24px + env(safe-area-inset-bottom))',boxShadow:'0 -10px 40px rgba(0,0,0,.18)'}} onClick={(e)=>e.stopPropagation()}><h2 style={{margin:'0 0 6px',fontSize:'1.45rem'}}>{en?'Block availability':'Blockera tillgänglighet'}</h2><p style={{margin:'0 0 20px',color:'var(--muted)'}}>{selection.from===selection.to?selection.from:`${selection.from} – ${selection.to}`}</p><label style={{display:'grid',gap:7,marginBottom:16,fontWeight:750}}>{en?'Listing':'Annons'}<select value={blockProduct} onChange={(e)=>setBlockProduct(e.target.value)} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff',font:'inherit'}}>{products.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><label style={{display:'grid',gap:7,marginBottom:16,fontWeight:750}}>{en?'Reason':'Orsak'}<select value={status} onChange={(e)=>setStatus(e.target.value as 'blocked'|'service')} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff',font:'inherit'}}><option value="blocked">{en?'Blocked by host':'Blockerad av uthyrare'}</option><option value="service">{en?'Service / maintenance':'Service / underhåll'}</option></select></label><label style={{display:'grid',gap:7,marginBottom:20,fontWeight:750}}>{en?'Note (optional)':'Notering (valfritt)'}<input value={note} onChange={(e)=>setNote(e.target.value)} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',font:'inherit'}}/></label><div style={{display:'flex',gap:10}}><button type="button" onClick={()=>setModalOpen(false)} style={{flex:1,minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Cancel':'Avbryt'}</button><button type="button" disabled={saving||!blockProduct} onClick={saveBlock} style={{flex:2,minHeight:52,border:0,borderRadius:16,background:'var(--ink)',color:'#fff',fontWeight:850,opacity:saving ? .65 : 1}}>{saving?(en?'Saving…':'Sparar…'):(en?'Block':'Blockera')}</button></div></div></div>}
    </section>
  );
}
