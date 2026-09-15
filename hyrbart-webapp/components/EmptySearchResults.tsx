import Link from 'next/link';

type Alternative={value:string;label:string};
export default function EmptySearchResults({locale,query='',categories=[]}:{locale:string;query?:string;categories?:Alternative[]}){
 const en=locale==='en';
 return <section className="rentEmpty2" aria-labelledby="zero-results-title">
  <h2 id="zero-results-title">{en?'No exact matches':'Inga exakta träffar'}</h2>
  <p>{query?(en?`We couldn't find “${query}” with all selected filters.`:`Vi hittade inte ”${query}” med alla valda filter.`):(en?'No products match all selected filters.':'Inga produkter matchar alla valda filter.')}</p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',margin:'16px 0'}}>
   <Link href={`/${locale}/produkter`} style={{display:'inline-flex',minHeight:42,alignItems:'center',padding:'0 14px',borderRadius:12,background:'var(--accent)',color:'var(--ink)',fontWeight:800,textDecoration:'none'}}>{en?'Clear search and filters':'Rensa sökning och filter'}</Link>
  </div>
  {categories.length?<div><strong>{en?'Explore instead':'Utforska istället'}</strong><div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginTop:10}}>{categories.slice(0,5).map(c=><Link key={c.value} href={`/${locale}/produkter?category=${encodeURIComponent(c.value)}`} style={{padding:'8px 11px',border:'1px solid var(--line)',borderRadius:999,color:'var(--ink)',textDecoration:'none'}}>{c.label}</Link>)}</div></div>:null}
 </section>
}
