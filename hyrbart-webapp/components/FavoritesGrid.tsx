'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductVisual from './ProductVisual';
import { ProductBadgeLabel } from './ProductPricing';

type FavoriteProduct={slug:string;brand:string;name:string;type:string;typeEn?:string;price:string;image?:string;accent?:string;badge?:'popular'|'very-popular'};
const EVENT='hyrbart:favorites-changed';
const STORAGE_KEY='hyrbart:favorites';

function readLegacyLocalFavorites(){
 try{
  const raw=window.localStorage.getItem(STORAGE_KEY);
  const parsed=raw?JSON.parse(raw):[];
  return Array.isArray(parsed)?parsed.filter((value):value is string=>typeof value==='string'):[];
 }catch{return [] as string[]}
}

function clearLegacyLocalFavorites(){try{window.localStorage.removeItem(STORAGE_KEY)}catch{}}

export default function FavoritesGrid({locale,products}:{locale:string;products:FavoriteProduct[]}){
 const en=locale==='en'; const [slugs,setSlugs]=useState<string[]>([]),[loading,setLoading]=useState(true),[authenticated,setAuthenticated]=useState(true);
 async function sync(){
  try{
   let response=await fetch('/api/favorites',{cache:'no-store'});
   if(response.status===401){setAuthenticated(false);setSlugs([]);return;}
   if(!response.ok)throw new Error('Could not load favorites');
   let data=await response.json() as {favorites?:string[]};
   const legacy=readLegacyLocalFavorites();
   if(legacy.length){
    const migrateResponse=await fetch('/api/favorites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({migrate:legacy})});
    if(migrateResponse.ok){data=await migrateResponse.json() as {favorites?:string[]};clearLegacyLocalFavorites();}
   }
   setAuthenticated(true);
   setSlugs(data.favorites??[]);
  }catch{}finally{setLoading(false)}
 }
 useEffect(()=>{void sync();const listener=()=>void sync();window.addEventListener(EVENT,listener);return()=>window.removeEventListener(EVENT,listener)},[]);
 const favorites=slugs.map(slug=>products.find(product=>product.slug===slug)).filter((product):product is FavoriteProduct=>Boolean(product));
 if(loading)return <p className="ds2Intro">{en?'Loading favorites…':'Laddar favoriter…'}</p>;
 if(!authenticated)return <p className="ds2Intro">{en?'Sign in to see your favorites.':'Logga in för att se dina favoriter.'}</p>;
 if(!favorites.length)return <p className="ds2Intro">{en?'Products you save will appear here.':'Produkter du favoritmarkerar kommer att visas här.'}</p>;
 return <section className="productGrid2 favoritesGrid2">{favorites.map(product=><Link key={product.slug} href={`/${locale}/produkter/${product.slug}`} className="productTile2"><div className="productTileVisual2"><ProductVisual kind="cleaner" accent={product.accent} imageSrc={product.image} imageAlt={`${product.brand} ${product.name}`}/><ProductBadgeLabel badge={product.badge} locale={locale}/></div><div className="productTileCopy2"><strong className="productTileTitle2"><span className="productTileBrand2">{product.brand}</span><span className="productTileName2">{product.name}</span></strong><span>{en?(product.typeEn??product.type):product.type}</span><b>{product.price}</b></div></Link>)}</section>
}
