import Link from 'next/link';
import AutomatedMessages from '@/components/AutomatedMessages';

export default async function AutomatedMessagesPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;const en=locale==='en';
 return <section className="ds2Page"><header className="ds2Header"><Link href={`/${locale}/vard/meddelanden`} aria-label={en?'Back':'Tillbaka'} style={{fontSize:'1.5rem'}}>‹</Link><h1 style={{marginTop:18}}>{en?'Automated customer messages':'Automatiserade kundmeddelanden'}</h1><p className="ds2Intro">{en?'Create messages that are sent automatically at selected moments in the rental.':'Skapa meddelanden som skickas automatiskt vid valda tillfällen under uthyrningen.'}</p></header><AutomatedMessages locale={locale}/></section>
}
