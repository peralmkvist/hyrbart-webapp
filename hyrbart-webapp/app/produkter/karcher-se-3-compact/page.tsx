import Link from 'next/link';
import ProductVisual from '@/components/ProductVisual';
import { BackIcon, BookIcon, CheckIcon, InfoIcon, ListIcon } from '@/components/Icons';

const included = ['Universalmunstycke', 'Möbelmunstycke', 'Skomunstycke', '1 dos rengöringsmedel'];

export default function ProductPage() {
  return <div className="pageShell detailPage">
    <Link href="/produkter" className="backLink" aria-label="Till produkter"><BackIcon/></Link>
    <header className="productTitle"><h1>KÄRCHER<br/>SE 3 COMPACT</h1><p>Textil- och möbeltvätt</p></header>
    <ProductVisual large />
    <section className="included"><h2>Det här ingår</h2><div className="includedGrid">{included.map(x=><div key={x}><span className="checkCircle"><CheckIcon/></span><span>{x}</span></div>)}</div></section>
    <details className="specDropdown"><summary><ListIcon/>Specifikationer <span>⌄</span></summary><div className="specBody"><div><b>Tankvolym</b><span>1,7 / 2,9 l</span></div><div><b>Vikt</b><span>4,6 kg</span></div></div></details>
    <div className="stackedActions">
      <Link href="/produkter/karcher-se-3-compact/guide" className="darkAction"><BookIcon/><span>Användarguide</span><b>›</b></Link>
      <Link href="/produkter/karcher-se-3-compact/guide#vanliga-fel" className="darkAction"><InfoIcon/><span>Vanliga problem</span><b>›</b></Link>
      <Link href="/produkter/karcher-se-3-compact/guide#aterlamning" className="darkAction"><CheckIcon/><span>Innan återlämning</span><b>›</b></Link>
    </div>
    <a className="primaryButton wide" href="https://www.hygglo.se" target="_blank" rel="noreferrer">Boka på Hygglo <span>↗</span></a>
  </div>;
}
