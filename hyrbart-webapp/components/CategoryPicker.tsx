'use client';

import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_TAXONOMY, type CategoryNode } from '@/lib/category-taxonomy';

type Props={
  value:string;
  onChange:(leafName:string,path:string[])=>void;
  en?:boolean;
};

function findPath(nodes:readonly CategoryNode[],target:string,parents:CategoryNode[]=[]):CategoryNode[]|null{
  for(const node of nodes){
    const path=[...parents,node];
    if(node.name===target&&!node.children?.length)return path;
    if(node.children?.length){const found=findPath(node.children,target,path);if(found)return found;}
  }
  return null;
}

export default function CategoryPicker({value,onChange,en=false}:Props){
  const initial=useMemo(()=>value?findPath(CATEGORY_TAXONOMY,value):null,[value]);
  const [main,setMain]=useState(initial?.[0]?.name||'');
  const [sub,setSub]=useState(initial?.[1]?.name||'');
  const [detail,setDetail]=useState(initial?.[2]?.name||'');

  useEffect(()=>{
    if(!value)return;
    const path=findPath(CATEGORY_TAXONOMY,value);
    if(path){setMain(path[0]?.name||'');setSub(path[1]?.name||'');setDetail(path[2]?.name||'');}
  },[value]);

  const mainNode=CATEGORY_TAXONOMY.find(x=>x.name===main);
  const subNode=mainNode?.children?.find(x=>x.name===sub);
  const subOptions=mainNode?.children||[];
  const detailOptions=subNode?.children||[];

  function chooseMain(name:string){
    setMain(name);setSub('');setDetail('');
    if(!name){onChange('',[]);return;}
    const node=CATEGORY_TAXONOMY.find(x=>x.name===name);
    if(node&&!node.children?.length)onChange(node.name,[node.name]);else onChange('',[]);
  }
  function chooseSub(name:string){
    setSub(name);setDetail('');
    if(!name){onChange('',[]);return;}
    const node=mainNode?.children?.find(x=>x.name===name);
    if(node&&!node.children?.length)onChange(node.name,[main,node.name]);else onChange('',[]);
  }
  function chooseDetail(name:string){
    setDetail(name);
    if(name)onChange(name,[main,sub,name]);else onChange('',[]);
  }

  return <div className="newListingCategoryPicker">
    <label className="newListingField"><span>{en?'Main category':'Huvudkategori'}</span><select value={main} onChange={e=>chooseMain(e.target.value)}><option value="">{en?'Choose main category':'Välj huvudkategori'}</option>{CATEGORY_TAXONOMY.map(node=><option key={node.name} value={node.name}>{node.name}</option>)}</select></label>
    {main&&subOptions.length>0?<label className="newListingField"><span>{en?'Subcategory':'Underkategori'}</span><select value={sub} onChange={e=>chooseSub(e.target.value)}><option value="">{en?'Choose subcategory':'Välj underkategori'}</option>{subOptions.map(node=><option key={node.name} value={node.name}>{node.name}</option>)}</select></label>:null}
    {sub&&detailOptions.length>0?<label className="newListingField"><span>{en?'Detailed category':'Detaljkategori'}</span><select value={detail} onChange={e=>chooseDetail(e.target.value)}><option value="">{en?'Choose detailed category':'Välj detaljkategori'}</option>{detailOptions.map(node=><option key={node.name} value={node.name}>{node.name}</option>)}</select></label>:null}
    {value?<small className="newListingCategoryPath">{[main,sub,detail].filter(Boolean).join(' › ')}</small>:null}
  </div>;
}
