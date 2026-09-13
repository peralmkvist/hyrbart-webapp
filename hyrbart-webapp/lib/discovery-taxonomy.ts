import { CATEGORY_TAXONOMY, type CategoryNode } from '@/lib/category-taxonomy-complete';

export type DiscoveryCategory={name:string;root:string;path:string[];searchText:string};

const LEGACY_ROOTS:Record<string,string>={
  'Barnartiklar':'Hem & hushåll',
  'Belysning':'Bygg & verktyg',
  'Biltillbehör':'Fordon',
  'Borra & Skruva':'Bygg & verktyg',
  'Handverktyg':'Bygg & verktyg',
  'Hem & hushåll':'Hem & hushåll',
  'Håltagning':'Bygg & verktyg',
  'Kontor':'Elektronik',
  'Luftverktyg':'Bygg & verktyg',
  'Mäta':'Bygg & verktyg',
  'Städa & Tvätta':'Hem & hushåll',
  'Såga & Slipa':'Bygg & verktyg',
  'Trädgård':'Trädgård',
  'Värme':'Bygg & verktyg',
};

const EN_ROOT_LABELS:Record<string,string>={
  'Bygg & verktyg':'Construction & tools',
  'Elektronik':'Electronics',
  'Fest':'Party',
  'Film & foto':'Film & photo',
  'Fordon':'Vehicles',
  'Hem & hushåll':'Home & household',
  'Sport & fritid':'Sports & leisure',
  'Trädgård':'Garden',
};

function normalize(value:string){return value.trim().toLocaleLowerCase('sv-SE')}

const entries:DiscoveryCategory[]=[];
function walk(nodes:readonly CategoryNode[],parents:string[]=[]){
  for(const node of nodes){
    const path=[...parents,node.name];
    entries.push({name:node.name,root:path[0],path,searchText:path.join(' ')});
    if(node.children?.length)walk(node.children,path);
  }
}
walk(CATEGORY_TAXONOMY);

const byName=new Map<string,DiscoveryCategory[]>();
for(const entry of entries){const key=normalize(entry.name);byName.set(key,[...(byName.get(key)||[]),entry])}

export const DISCOVERY_ROOTS=CATEGORY_TAXONOMY.map(node=>node.name);
export function rootLabel(root:string,locale:string){return locale==='en'?(EN_ROOT_LABELS[root]||root):root}

export function resolveCategory(value?:string|null):DiscoveryCategory|null{
  if(!value)return null;
  const normalized=normalize(value);
  const candidates=byName.get(normalized);
  if(candidates?.length===1)return candidates[0];
  if(candidates?.length>1)return candidates.find(item=>item.path.length===1)||candidates[0];
  const legacyRoot=LEGACY_ROOTS[value]||Object.entries(LEGACY_ROOTS).find(([key])=>normalize(key)===normalized)?.[1];
  return legacyRoot?{name:value,root:legacyRoot,path:[legacyRoot,value],searchText:`${legacyRoot} ${value}`}:null;
}

export function categoryBelongsToRoot(category:string|undefined,root:string|undefined){
  if(!root)return true;
  return resolveCategory(category)?.root===root;
}

export function categorySearchTerms(category:string|undefined){
  const resolved=resolveCategory(category);
  return resolved?resolved.path:category?[category]:[];
}

export function categoryIntegrity(categories:(string|undefined)[]){
  const unknown=[...new Set(categories.filter((value):value is string=>Boolean(value)&&!resolveCategory(value)))].sort((a,b)=>a.localeCompare(b,'sv'));
  return {unknown,total:categories.length};
}
