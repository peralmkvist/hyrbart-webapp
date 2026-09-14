import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET='automated-message-assets';
const MAX_FILE_SIZE=8*1024*1024;
const ALLOWED=new Set(['image/jpeg','image/png','image/webp','image/heic']);

async function currentUser(){const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();return user;}

export async function POST(request:Request){
 try{
  const user=await currentUser();if(!user)return NextResponse.json({error:'Inte inloggad.'},{status:401});
  const form=await request.formData();const templateId=String(form.get('templateId')||'');const files=form.getAll('files').filter((item):item is File=>item instanceof File&&item.size>0);
  if(!templateId||!files.length)return NextResponse.json({error:'Mall och minst en bild krävs.'},{status:400});
  const admin=createAdminClient();const{data:template}=await admin.from('automated_message_templates').select('id').eq('id',templateId).eq('owner_id',user.id).maybeSingle();if(!template)return NextResponse.json({error:'Mallen hittades inte.'},{status:404});
  const{count}=await admin.from('automated_message_template_assets').select('id',{count:'exact',head:true}).eq('template_id',templateId).eq('owner_id',user.id);
  if((count||0)+files.length>5)return NextResponse.json({error:'En mall kan ha högst fem bilder.'},{status:400});
  for(const file of files){
   if(file.size>MAX_FILE_SIZE)return NextResponse.json({error:'Varje bild får vara högst 8 MB.'},{status:400});
   if(!ALLOWED.has(file.type))return NextResponse.json({error:'Tillåtna bildformat är JPG, PNG, WebP och HEIC.'},{status:400});
  }
  let position=count||0;
  for(const file of files){
   const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`${user.id}/${templateId}/${crypto.randomUUID()}.${ext}`;
   const bytes=new Uint8Array(await file.arrayBuffer());const{error:uploadError}=await admin.storage.from(BUCKET).upload(path,bytes,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
   const{error:insertError}=await admin.from('automated_message_template_assets').insert({template_id:templateId,owner_id:user.id,storage_path:path,file_name:file.name.slice(0,180),content_type:file.type,size_bytes:file.size,position:position++});
   if(insertError){await admin.storage.from(BUCKET).remove([path]);throw insertError;}
  }
  return NextResponse.json({ok:true});
 }catch(error){console.error('Automated message asset upload failed',error);return NextResponse.json({error:'Kunde inte ladda upp bilden.'},{status:500});}
}

export async function DELETE(request:Request){
 try{
  const user=await currentUser();if(!user)return NextResponse.json({error:'Inte inloggad.'},{status:401});
  const id=new URL(request.url).searchParams.get('id');if(!id)return NextResponse.json({error:'Bild-id saknas.'},{status:400});
  const admin=createAdminClient();const{data:asset}=await admin.from('automated_message_template_assets').select('id,storage_path').eq('id',id).eq('owner_id',user.id).maybeSingle();if(!asset)return NextResponse.json({error:'Bilden hittades inte.'},{status:404});
  const{error}=await admin.from('automated_message_template_assets').delete().eq('id',id).eq('owner_id',user.id);if(error)throw error;
  await admin.storage.from(BUCKET).remove([asset.storage_path]);return NextResponse.json({ok:true});
 }catch(error){console.error('Automated message asset delete failed',error);return NextResponse.json({error:'Kunde inte ta bort bilden.'},{status:500});}
}
