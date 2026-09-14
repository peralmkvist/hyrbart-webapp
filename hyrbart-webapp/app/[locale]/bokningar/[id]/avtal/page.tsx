import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PrintButton from '@/components/PrintButton';
import { createClient } from '@/lib/supabase/server';
import { ensureBookingAgreement, type BookingAgreementSnapshot } from '@/lib/booking-agreements';

function money(value:number,currency:string,locale:string){
  return new Intl.NumberFormat(locale==='en'?'en-GB':'sv-SE',{style:'currency',currency:currency||'SEK',maximumFractionDigits:0}).format(Number(value||0));
}
function date(value:string,locale:string){return new Intl.DateTimeFormat(locale==='en'?'en-GB':'sv-SE',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`));}
function dateTime(value:string|null,locale:string){return value?new Intl.DateTimeFormat(locale==='en'?'en-GB':'sv-SE',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';}
function handover(value:string,time:string|null,locale:string){return `${date(value,locale)}${time?` · ${time.slice(0,5)}`:''}`;}
const policyNames:Record<string,{sv:string;en:string}>={flexible:{sv:'Flexibel',en:'Flexible'},moderate:{sv:'Måttlig',en:'Moderate'},restrained:{sv:'Återhållsam',en:'Restrained'},limited:{sv:'Begränsad',en:'Limited'},strict:{sv:'Strikt',en:'Strict'}};

export default async function BookingAgreementPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params;
  const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/bokningar/${id}/avtal`)}`);
  const {data:booking}=await supabase.from('bookings').select('id,renter_id,owner_id,status').eq('id',id).maybeSingle();
  if(!booking||![booking.renter_id,booking.owner_id].includes(user.id)||booking.status!=='completed')notFound();

  const agreement=await ensureBookingAgreement(id);
  const snapshot=agreement.snapshot as BookingAgreementSnapshot;
  const policy=policyNames[snapshot.terms.cancellationPolicy];
  const isOwner=booking.owner_id===user.id;
  const backHref=isOwner?`/topsecret/${locale}/vard/bokningar/${id}`:`/topsecret/${locale}/bokningar/${id}`;

  return <main style={{maxWidth:760,margin:'0 auto',padding:'28px 20px 80px',fontFamily:'inherit'}}>
    <header style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:28}}>
      <div><span style={{fontSize:12,fontWeight:850,letterSpacing:'.09em'}}>HYRBART</span><h1 style={{margin:'8px 0 5px'}}>{en?'Rental agreement':'Hyresavtal'}</h1><p style={{margin:0,color:'var(--muted)'}}>{en?'Immutable record generated when the rental was completed.':'Oföränderligt underlag genererat när uthyrningen slutfördes.'}</p></div>
      <Link href={backHref} style={{fontSize:28,color:'inherit',textDecoration:'none'}} aria-label={en?'Back':'Tillbaka'}>×</Link>
    </header>

    <section style={card}><Row label={en?'Agreement reference':'Avtalsreferens'} value={snapshot.reference}/><Row label={en?'Agreement version':'Avtalsversion'} value={snapshot.agreementVersion}/><Row label={en?'Completed':'Slutförd'} value={dateTime(snapshot.completedAt,locale)}/><Row label={en?'Agreement generated':'Avtal genererat'} value={dateTime(snapshot.generatedAt,locale)}/></section>

    <section style={card}><h2 style={heading}>{en?'Parties':'Parter'}</h2><Row label={en?'Owner':'Uthyrare'} value={[snapshot.parties.owner.displayName||'—',snapshot.parties.owner.city].filter(Boolean).join(' · ')}/><Row label={en?'Renter':'Hyrestagare'} value={[snapshot.parties.renter.displayName||'—',snapshot.parties.renter.city].filter(Boolean).join(' · ')}/></section>

    <section style={card}><h2 style={heading}>{en?'Rental':'Uthyrning'}</h2><Row label={en?'Item':'Produkt'} value={snapshot.rental.productName}/><Row label={en?'Pickup':'Utlämning'} value={handover(snapshot.rental.startDate,snapshot.rental.pickupTime,locale)}/><Row label={en?'Return':'Återlämning'} value={handover(snapshot.rental.endDate,snapshot.rental.returnTime,locale)}/><Row label={en?'Rental price':'Hyra'} value={money(snapshot.rental.rentalPrice,snapshot.rental.currency,locale)}/><Row label={en?'Service fee':'Serviceavgift'} value={money(snapshot.rental.serviceFee,snapshot.rental.currency,locale)}/><Row label={en?'Total':'Totalt'} value={money(snapshot.rental.totalPrice,snapshot.rental.currency,locale)}/></section>

    <section style={card}><h2 style={heading}>{en?'Terms at booking':'Villkor vid bokning'}</h2><Row label={en?'Cancellation policy':'Avbokningspolicy'} value={policy?(en?policy.en:policy.sv):snapshot.terms.cancellationPolicy}/><Row label={en?'Rental terms version':'Hyresvillkor version'} value={snapshot.terms.termsVersion||(en?'Legacy booking – no stored version':'Äldre bokning – ingen sparad version')}/><Row label={en?'Accepted':'Godkända'} value={dateTime(snapshot.terms.termsAcceptedAt,locale)}/><Row label={en?'Terms language':'Villkorsspråk'} value={snapshot.terms.termsLocale?.toUpperCase()||'—'}/><p style={{margin:'16px 0 0',fontSize:14,lineHeight:1.5}}>{en?'This agreement records the terms version stored with the booking. The currently published terms may be a later version.':'Avtalet dokumenterar den villkorsversion som sparades med bokningen. Nu publicerade villkor kan vara en senare version.'} <Link href={`/topsecret/${locale}/hyresvillkor`}>{en?'View current terms':'Visa nuvarande villkor'}</Link>.</p></section>

    <section style={card}><h2 style={heading}>{en?'Integrity':'Integritet'}</h2><Row label={en?'SHA-256 fingerprint':'SHA-256-fingeravtryck'} value={agreement.content_hash}/><p style={{margin:'12px 0 0',fontSize:13,lineHeight:1.5,color:'var(--muted)'}}>{en?'The fingerprint identifies the exact frozen agreement data. Both parties read the same stored snapshot.':'Fingeravtrycket identifierar exakt den frysta avtalsdatan. Båda parter läser samma lagrade snapshot.'}</p></section>

    <div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',marginTop:22}}><small style={{maxWidth:460,lineHeight:1.45,color:'var(--muted)'}}>{en?'Generated by Hyrbart from the completed booking record. Legal wording and historical terms retention remain subject to Hyrbart’s legal review.':'Genererat av Hyrbart från den slutförda bokningen. Juridisk formulering och arkivering av historiska villkor omfattas fortsatt av Hyrbarts juridiska granskning.'}</small><PrintButton label={en?'Print / save PDF':'Skriv ut / spara PDF'}/></div>
  </main>;
}

function Row({label,value}:{label:string;value:string}){return <div style={{display:'grid',gridTemplateColumns:'minmax(130px,.8fr) minmax(0,1.4fr)',gap:16,padding:'11px 0',borderBottom:'1px solid var(--line)'}}><span style={{color:'var(--muted)'}}>{label}</span><strong style={{overflowWrap:'anywhere'}}>{value}</strong></div>;}
const card={background:'#fff',border:'1px solid var(--line)',borderRadius:20,padding:'18px 20px',marginBottom:14} as const;
const heading={margin:'0 0 8px',fontSize:18} as const;
