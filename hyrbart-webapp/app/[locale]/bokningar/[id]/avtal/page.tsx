import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PrintButton from '@/components/PrintButton';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/sanity-products';

function money(value:unknown,locale:string){return `${Number(value||0).toLocaleString(locale==='en'?'en-GB':'sv-SE')} kr`;}
function date(value:string,locale:string){return new Intl.DateTimeFormat(locale==='en'?'en-GB':'sv-SE',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`));}
const policyNames:Record<string,{sv:string;en:string}>={flexible:{sv:'Flexibel',en:'Flexible'},moderate:{sv:'Måttlig',en:'Moderate'},restrained:{sv:'Återhållsam',en:'Restrained'},limited:{sv:'Begränsad',en:'Limited'},strict:{sv:'Strikt',en:'Strict'}};

export default async function BookingAgreementPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params;
  const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/bokningar/${id}/avtal`)}`);
  const {data:booking}=await supabase.from('bookings').select('*').eq('id',id).maybeSingle();
  if(!booking||![booking.renter_id,booking.owner_id].includes(user.id))notFound();

  const [{data:profiles},products]=await Promise.all([
    supabase.from('profiles').select('id,display_name,city').in('id',[booking.renter_id,booking.owner_id]),
    getProducts(),
  ]);
  const renter=(profiles||[]).find(profile=>profile.id===booking.renter_id);
  const owner=(profiles||[]).find(profile=>profile.id===booking.owner_id);
  const product=products.find(item=>item.id===booking.product_id);
  const reference=`HYR-${booking.id.replace(/-/g,'').slice(0,8).toUpperCase()}`;
  const policy=policyNames[booking.cancellation_policy||'moderate'];

  return <main style={{maxWidth:760,margin:'0 auto',padding:'28px 20px 80px',fontFamily:'inherit'}}>
    <header style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:28}}>
      <div><span style={{fontSize:12,fontWeight:850,letterSpacing:'.09em'}}>HYRBART</span><h1 style={{margin:'8px 0 5px'}}>{en?'Booking agreement':'Bokningsunderlag'}</h1><p style={{margin:0,color:'var(--muted)'}}>{en?'Snapshot of the terms and details saved with this booking.':'Snapshot av villkor och uppgifter som sparats med bokningen.'}</p></div>
      <Link href={`/topsecret/${locale}/bokningar/${id}`} style={{fontSize:28,color:'inherit',textDecoration:'none'}} aria-label={en?'Back':'Tillbaka'}>×</Link>
    </header>

    <section style={card}><Row label={en?'Booking reference':'Bokningsreferens'} value={reference}/><Row label={en?'Status':'Status'} value={booking.status}/><Row label={en?'Created':'Skapad'} value={new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(booking.created_at))}/></section>

    <section style={card}><h2 style={heading}>{en?'Parties':'Parter'}</h2><Row label={en?'Owner':'Uthyrare'} value={[owner?.display_name||'—',owner?.city].filter(Boolean).join(' · ')}/><Row label={en?'Renter':'Hyrestagare'} value={[renter?.display_name||'—',renter?.city].filter(Boolean).join(' · ')}/></section>

    <section style={card}><h2 style={heading}>{en?'Rental':'Uthyrning'}</h2><Row label={en?'Item':'Produkt'} value={product?[product.brand,product.name].filter(Boolean).join(' '):(booking.product_id||'—')}/><Row label={en?'Pickup':'Utlämning'} value={date(booking.start_date,locale)}/><Row label={en?'Return':'Återlämning'} value={date(booking.end_date,locale)}/><Row label={en?'Rental price':'Hyra'} value={money(booking.rental_price,locale)}/><Row label={en?'Service fee':'Serviceavgift'} value={money(booking.service_fee,locale)}/><Row label={en?'Total':'Totalt'} value={money(booking.total_price,locale)}/></section>

    <section style={card}><h2 style={heading}>{en?'Terms snapshot':'Villkorssnapshot'}</h2><Row label={en?'Cancellation policy':'Avbokningspolicy'} value={policy?(en?policy.en:policy.sv):(booking.cancellation_policy||'—')}/><Row label={en?'Rental terms version':'Hyresvillkor version'} value={booking.terms_version|| (en?'Legacy booking – no version snapshot':'Äldre bokning – ingen versionssnapshot')}/><Row label={en?'Accepted':'Godkända'} value={booking.terms_accepted_at?new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(booking.terms_accepted_at)):'—'}/><p style={{margin:'16px 0 0',fontSize:14,lineHeight:1.5}}>{en?'The detailed rental terms are incorporated through the version stored above. Any protection or insurance applies only when it is explicitly stated for the booking.':'De fullständiga hyresvillkoren införlivas genom versionen som sparats ovan. Eventuellt skydd eller försäkring gäller endast när det uttryckligen anges för bokningen.'} <Link href={`/topsecret/${locale}/hyresvillkor`}>{en?'Read current terms':'Läs aktuella villkor'}</Link>.</p></section>

    <div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',marginTop:22}}><small style={{maxWidth:460,lineHeight:1.45,color:'var(--muted)'}}>{en?'This page is a booking record generated by Hyrbart. It is not an insurance certificate and does not replace any mandatory consumer information from a future payment, identity or insurance provider.':'Den här sidan är ett bokningsunderlag genererat av Hyrbart. Den är inte ett försäkringsbevis och ersätter inte obligatorisk information från en framtida betal-, identitets- eller försäkringsleverantör.'}</small><PrintButton label={en?'Print / save PDF':'Skriv ut / spara PDF'}/></div>
  </main>;
}

function Row({label,value}:{label:string;value:string}){return <div style={{display:'grid',gridTemplateColumns:'minmax(130px,.8fr) 1.4fr',gap:16,padding:'11px 0',borderBottom:'1px solid var(--line)'}}><span style={{color:'var(--muted)'}}>{label}</span><strong>{value}</strong></div>;}
const card={background:'#fff',border:'1px solid var(--line)',borderRadius:20,padding:'18px 20px',marginBottom:14} as const;
const heading={margin:'0 0 8px',fontSize:18} as const;
