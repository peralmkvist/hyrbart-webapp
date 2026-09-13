'use client';

import { useState } from 'react';
import HostCalendar from './HostCalendar';
import AutomatedMessages from './AutomatedMessages';
import { MailIcon } from './Icons';

export default function HostBookingsWorkspace({ locale }: { locale: string }) {
  const en = locale === 'en';
  const [automationsOpen, setAutomationsOpen] = useState(false);

  return <>
    <HostCalendar locale={locale} />

    <button
      type="button"
      className="hostAutomationsIconButton"
      onClick={() => setAutomationsOpen(true)}
      aria-label={en?'Automated messages':'Automatiserade meddelanden'}
      aria-haspopup="dialog"
      aria-expanded={automationsOpen}
    ><MailIcon/></button>

    {automationsOpen ? <div
      role="dialog"
      aria-modal="true"
      aria-label={en?'Automated messages':'Automatiserade meddelanden'}
      style={{position:'fixed',inset:0,zIndex:500,background:'rgba(17,17,17,.22)',display:'flex',justifyContent:'center',alignItems:'stretch'}}
      onClick={() => setAutomationsOpen(false)}
    >
      <section
        onClick={event => event.stopPropagation()}
        style={{width:'min(760px, 100%)',height:'100dvh',overflowY:'auto',background:'var(--bg)',padding:'max(24px, env(safe-area-inset-top)) 18px calc(28px + env(safe-area-inset-bottom))',boxSizing:'border-box'}}
      >
        <header style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:18,marginBottom:24}}>
          <div>
            <h1 style={{margin:0,fontSize:'clamp(2rem, 8vw, 3rem)',lineHeight:.98,letterSpacing:'-.055em'}}>{en?'Automated messages':'Automatiserade meddelanden'}</h1>
            <p style={{margin:'12px 0 0',maxWidth:540,color:'var(--muted)',lineHeight:1.5}}>{en?'Messages sent automatically at selected moments during the rental.':'Meddelanden som skickas automatiskt vid valda tillfällen under uthyrningen.'}</p>
          </div>
          <button type="button" onClick={() => setAutomationsOpen(false)} aria-label={en?'Close':'Stäng'} style={{width:44,height:44,flex:'0 0 auto',border:0,borderRadius:14,background:'#f0f0ee',fontSize:'1.55rem',lineHeight:1,cursor:'pointer'}}>×</button>
        </header>
        <AutomatedMessages locale={locale}/>
      </section>
    </div> : null}
  </>;
}
