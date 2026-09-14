type LateReturn = {
  scheduled_return_at:string;
  returned_at:string|null;
  overdue_minutes:number;
  estimated_extension_amount:number;
  currency:string;
  fee_status:string;
  escalation_level:number;
  resolved_at:string|null;
};

function duration(minutes:number,en:boolean){
  if(minutes<60)return en?`${minutes} min`:`${minutes} min`;
  const hours=Math.floor(minutes/60),rest=minutes%60;
  return rest?`${hours} h ${rest} min`:`${hours} h`;
}

export default function LateReturnCard({late,locale='sv',isOwner}:{late:LateReturn|null;locale?:string;isOwner:boolean}){
  if(!late)return null;
  const en=locale==='en';
  const open=!late.resolved_at;
  const amount=Number(late.estimated_extension_amount||0).toLocaleString(en?'en-GB':'sv-SE');
  const level=Number(late.escalation_level||1);
  return <section style={{border:'1px solid #e0a100',background:'#fff9e8',borderRadius:20,padding:'18px 20px',marginBottom:14}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}>
      <div><span style={{fontSize:12,fontWeight:850,letterSpacing:'.06em'}}>{en?'LATE RETURN':'SEN RETUR'}</span><h2 style={{fontSize:19,margin:'5px 0 4px'}}>{open?(en?'Return is overdue':'Återlämningen är försenad'):(en?'Late return recorded':'Sen retur registrerad')}</h2></div>
      <strong style={{fontSize:13}}>{en?'Level':'Nivå'} {level}/3</strong>
    </div>
    <p style={{margin:'8px 0 0',lineHeight:1.5}}>{open
      ? (isOwner?(en?'The renter has not yet documented the return. You will be notified when it is marked returned.':'Hyrestagaren har ännu inte dokumenterat återlämningen. Du får en notifiering när den markeras som återlämnad.'):(en?'Document the return as soon as the item has been handed back.':'Dokumentera återlämningen så snart objektet har lämnats tillbaka.'))
      : (en?`The return was ${duration(late.overdue_minutes,true)} late.`:`Återlämningen var ${duration(late.overdue_minutes,false)} sen.`)}</p>
    {!open&&late.estimated_extension_amount>0?<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(0,0,0,.12)'}}><span style={{display:'block',fontSize:13}}>{en?'Preliminary extra rental time':'Preliminärt tillägg för extra hyrestid'}</span><strong style={{display:'block',fontSize:22,marginTop:3}}>{amount} {late.currency==='SEK'?'kr':late.currency}</strong><small style={{display:'block',marginTop:5,lineHeight:1.4}}>{en?'Calculated from the booking’s effective rental rate. This is not a completed charge and remains pending review.':'Beräknat utifrån bokningens effektiva hyrespris. Beloppet är inte debiterat utan väntar på granskning.'}</small></div>:null}
    {open&&level>=3&&isOwner?<small style={{display:'block',marginTop:12,fontWeight:700}}>{en?'If you need help, open a booking issue below.':'Behöver du hjälp kan du öppna ett bokningsärende nedan.'}</small>:null}
  </section>;
}
