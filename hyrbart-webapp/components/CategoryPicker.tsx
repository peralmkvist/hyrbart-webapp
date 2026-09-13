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

function optionsAt(path:string[],depth:number):readonly CategoryNode[]{
  if(depth===0)return CATEGORY_TAXONOMY;
  let nodes:readonly CategoryNode[]=CATEGORY_TAXONOMY;
  for(let i=0;i<depth;i++){
    const selected=nodes.find(node=>node.name===path[i]);
    if(!selected?.children)return [];
    nodes=selected.children;
  }
  return nodes;
}

export default function CategoryPicker({value,onChange,en=false}:Props){
  const initial=useMemo(()=>value?findPath(CATEGORY_TAXONOMY,value)?.map(node=>node.name)||[]:[],[value]);
  const [path,setPath]=useState<string[]>(initial);

  useEffect(()=>{
    if(!value){setPath([]);return;}
    const found=findPath(CATEGORY_TAXONOMY,value)?.map(node=>node.name);
    if(found)setPath(found);
  },[value]);

  const levels=useMemo(()=>{
    const result:{options:readonly CategoryNode[];selected:string;depth:number}[]=[];
    let depth=0;
    while(true){
      const options=optionsAt(path,depth);
      if(!options.length)break;
      result.push({options,selected:path[depth]||'',depth});
      const selected=options.find(node=>node.name===path[depth]);
      if(!selected?.children?.length)break;
      depth++;
    }
    return result;
  },[path]);

  function choose(depth:number,name:string){
    const next=[...path.slice(0,depth),...(name?[name]:[])];
    setPath(next);
    if(!name){onChange('',next);return;}
    const node=optionsAt(next,depth).find(item=>item.name===name);
    if(node&&!node.children?.length)onChange(node.name,next);else onChange('',next);
  }

  const labels=(depth:number)=>{
    if(depth===0)return en?'Main category':'Huvudkategori';
    if(depth===1)return en?'Subcategory':'Underkategori';
    if(depth===2)return en?'Detailed category':'Detaljkategori';
    return en?`Category level ${depth+1}`:`Kategorinivå ${depth+1}`;
  };
  const placeholders=(depth:number)=>en?`Choose ${labels(depth).toLowerCase()}`:`Välj ${labels(depth).toLowerCase()}`;

  return <div className="newListingCategoryPicker">
    {levels.map(({options,selected,depth})=><label className="newListingField" key={depth}><span>{labels(depth)}</span><select value={selected} onChange={e=>choose(depth,e.target.value)}><option value="">{placeholders(depth)}</option>{options.map(node=><option key={node.name} value={node.name}>{node.name}</option>)}</select></label>)}
    {value?<small className="newListingCategoryPath">{path.join(' › ')}</small>:null}
  </div>;
}
