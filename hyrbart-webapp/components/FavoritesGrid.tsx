'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProductVisual from './ProductVisual';
import { ProductBadgeLabel } from './ProductPricing';

type FavoriteProduct={slug:string;brand:string;name:string;type:string;typeEn?:string;price:string;image?:string;accent?:string;badge?:'popular'|'very-popular'};
const EVENT='hyrbart:favorites-changed';
const STORAGE_KEY='hyrbart:favorites';

function readLegacyLocalFavorites(){
 try{const raw=window.localStorage.getItem(STORAGE_KEY);const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed.filter((value):value is string=>typeof value==='string'):[];}catch{return [] as string[]}
}
function clearLegacyLocalFavorites(){try{window.localStorage.removeItem(STORAGE_KEY)}catch{}}

export default function FavoritesGrid({locale,products}:{locale:string;products:FavoriteProduct[]}){
 const en=locale==='en';
 const [slugs,setSlugs]=useState<string[]>([]),[loading,setLoading]=useState(true),[authenticated,setAuthenticated]=useState(true);
 const [filterOpen,setFilterOpen]=useState(false),[filter,setFilter]=useState('all'),[editing,setEditing]=useState(false),[removing,setRemoving]=useState<string|null>(null);
 async function sync(){
  try{
   let response=await fetch('/api/favorites',{cache:'no-store'});
   if(response.status===401){setAuthenticated(false);setSlugs([]);return;}
   if(!response.ok)throw new Error('Could not load favorites');
   let data=await response.json() as {favorites?:string[]};
   const legacy=readLegacyLocalFavorites();
   if(legacy.length){const migrateResponse=await fetch('/api/favorites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({migrate:legacy})});if(migrateResponse.ok){data=await migrateResponse.json() as {favorites?:string[]};clearLegacyLocalFavorites();}}
   setAuthenticated(true);setSlugs(data.favorites??[]);
  }catch{}finally{setLoading(false)}
 }
 useEffect(()=>{void sync();const listener=()=>void sync();window.addEventListener(EVENT,listener);return()=>window.removeEventListener(EVENT,listener)},[]);
 const favorites=slugs.map(slug=>products.find(product=>product.slug===slug)).filter((product):product is FavoriteProduct=>Boolean(product));
 const types=useMemo(()=>Array.from(new Set(favorites.map(product=>en?(product.typeEn??product.type):product.type))).sort(),[favorites,en]);
 const visible=filter==='all'?favorites:favorites.filter(product=>(en?(product.typeEn??product.type):product.type)===filter);
 async function removeFavorite(slug:string){
  setRemoving(slug);
  try{const response=await fetch('/api/favorites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug,favorite:false})});if(!response.ok)throw new Error();setSlugs(current=>current.filter(item=>item!==slug));window.dispatchEvent(new Event(EVENT));}finally{setRemoving(null)}
 }
 if(loading)return <p className="ds2Intro favoritesStatus2">{en?'Loading favorites…':'Laddar favoriter…'}</p>;
 if(!authenticated)return <p className="ds2Intro favoritesStatus2">{en?'Sign in to see your favorites.':'Logga in för att se dina favoriter.'}</p>;
 return <>
  <div className="favoritesToolbar2">
   <div className="favoritesFilterWrap2">
    <button type="button" className={`favoritesToolButton2 ${filter!=='all'?'active':''}`} aria-label={en?'Filter favorites':'Filtrera favoriter'} aria-expanded={filterOpen} onClick={()=>setFilterOpen(value=>!value)}>
     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
    </button>
    {filterOpen&&<div className="favoritesFilterMenu2"><button type="button" className={filter==='all'?'selected':''} onClick={()=>{setFilter('all');setFilterOpen(false)}}>{en?'All':'Alla'}</button>{types.map(type=><button type="button" key={type} className={filter===type?'selected':''} onClick={()=>{setFilter(type);setFilterOpen(false)}}>{type}</button>)}</div>}
   </div>
   <button type="button" className={`favoritesEditButton2 ${editing?'active':''}`} onClick={()=>setEditing(value=>!value)}>{editing?(en?'Done':'Klar'):(en?'Edit':'Redigera')}</button>
  </div>
  {!favorites.length?<p className="ds2Intro favoritesStatus2">{en?'Products you save will appear here.':'Produkter du favoritmarkerar kommer att visas här.'}</p>:!visible.length?<p className="ds2Intro favoritesStatus2">{en?'No favorites match this filter.':'Inga favoriter matchar filtret.'}</p>:
  <section className="productGrid2 favoritesGrid2">{visible.map(product=><div key={product.slug} className="favoriteTileWrap2"><Link href={`/${locale}/produkter/${product.slug}`} className="productTile2"><div className="productTileVisual2"><ProductVisual kind="cleaner" accent={product.accent} imageSrc={product.image} imageAlt={`${product.brand} ${product.name}`}/><ProductBadgeLabel badge={product.badge} locale={locale}/></div><div className="productTileCopy2"><strong className="productTileTitle2"><span className="productTileBrand2">{product.brand}</span><span className="productTileName2">{product.name}</span></strong><span>{en?(product.typeEn??product.type):product.type}</span><b>{product.price}</b></div></Link>{editing&&<button type="button" className="favoriteDeleteButton2" disabled={removing===product.slug} aria-label={en?`Remove ${product.brand} ${product.name} from favorites`:`Ta bort ${product.brand} ${product.name} från favoriter`} onClick={()=>void removeFavorite(product.slug)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg></button>}</div>)}</section>}
 </>;
}
