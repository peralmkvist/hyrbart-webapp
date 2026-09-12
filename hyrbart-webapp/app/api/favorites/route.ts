import { NextResponse } from 'next/server';

const projectId='djps09z6';
const dataset='production';
const apiVersion='2026-09-08';
const token=process.env.SANITY_API_WRITE_TOKEN;

async function query<T>(groq:string):Promise<T>{
 const url=`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
 const res=await fetch(url,{cache:'no-store'}); if(!res.ok) throw new Error('Sanity query failed');
 return (await res.json() as {result:T}).result;
}
async function mutate(mutations:unknown[]){
 if(!token) throw new Error('Missing SANITY_API_WRITE_TOKEN');
 const res=await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`},body:JSON.stringify({mutations})});
 if(!res.ok) throw new Error(await res.text());
}

export async function GET(){
 try{
  const profile=await query<{id?:string;favorites?:string[]} | null>(`*[_type=="userProfile"][0]{"id":_id,"favorites":favorites[]->slug.current}`);
  return NextResponse.json({favorites:profile?.favorites??[]});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not load favorites'},{status:500});}
}

export async function POST(request:Request){
 try{
  const {slug,favorite}=await request.json() as {slug?:string;favorite?:boolean};
  if(!slug) return NextResponse.json({error:'Missing slug'},{status:400});
  const profile=await query<{id?:string} | null>(`*[_type=="userProfile"][0]{"id":_id}`);
  const product=await query<{id?:string} | null>(`*[_type=="product" && slug.current==${JSON.stringify(slug)}][0]{"id":_id}`);
  if(!profile?.id||!product?.id) return NextResponse.json({error:'Profile or product not found'},{status:404});
  if(favorite){
   await mutate([{patch:{id:profile.id,setIfMissing:{favorites:[]},insert:{after:'favorites[-1]',items:[{_type:'reference',_ref:product.id,_key:product.id}]}}}]);
  }else{
   await mutate([{patch:{id:profile.id,unset:[`favorites[_ref==${JSON.stringify(product.id)}]`]}}]);
  }
  const updated=await query<string[]>(`*[_id==${JSON.stringify(profile.id)}][0].favorites[]->slug.current`);
  return NextResponse.json({favorites:updated??[]});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not update favorite'},{status:500});}
}
