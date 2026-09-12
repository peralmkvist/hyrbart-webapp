import Link from 'next/link';
import AutomatedMessages from '@/components/AutomatedMessages';

export default async function AutomatedMessagesPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';

  return (
    <section style={{maxWidth:760,margin:'0 auto',padding:'max(28px, env(safe-area-inset-top)) 18px calc(100px + env(safe-area-inset-bottom))'}}>
      <header style={{marginBottom:28}}>
        <Link
          href={`/${locale}/vard/meddelanden`}
          aria-label={en?'Back':'Tillbaka'}
          style={{display:'inline-grid',placeItems:'center',width:42,height:42,marginBottom:20,borderRadius:14,color:'var(--ink)',fontSize:'2rem',lineHeight:1,textDecoration:'none'}}
        >
          ‹
        </Link>
        <h1 style={{margin:0,maxWidth:620,fontSize:'clamp(2rem, 8vw, 3.6rem)',lineHeight:.96,letterSpacing:'-.055em'}}>
          {en?'Automated customer messages':'Automatiserade kundmeddelanden'}
        </h1>
        <p style={{margin:'16px 0 0',maxWidth:540,color:'var(--muted)',fontSize:'1rem',lineHeight:1.5}}>
          {en?'Create messages that are sent automatically at selected moments during the rental.':'Skapa meddelanden som skickas automatiskt vid valda tillfällen under uthyrningen.'}
        </p>
      </header>
      <AutomatedMessages locale={locale}/>
    </section>
  );
}
