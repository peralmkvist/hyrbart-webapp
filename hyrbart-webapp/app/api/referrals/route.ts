import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function makeCode(){return crypto.randomUUID().replace(/-/g,'').slice(0,12);}

export async function POST(request:Request){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Not authenticated'},{status:401});
    const body=await request.json() as {email?:string;locale?:string};
    const email=String(body.email||'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'Ogiltig e-postadress'},{status:400});
    if(user.email?.toLowerCase()===email)return NextResponse.json({error:'Du kan inte värva dig själv.'},{status:400});
    const code=makeCode();
    const {data,error}=await supabase.from('host_referrals').insert({inviter_user_id:user.id,invitee_email:email,referral_code:code,reward_sek:10}).select('id,invitee_email,referral_code').single();
    if(error){
      if(error.code==='23505')return NextResponse.json({error:'Det finns redan en aktiv inbjudan till den här e-postadressen.'},{status:409});
      throw error;
    }
    const locale=body.locale==='en'?'en':'sv';
    const origin=new URL(request.url).origin;
    const shareUrl=`${origin}/${locale}/topsecret/${locale}/logga-in?ref=${encodeURIComponent(data.referral_code)}`.replace(`/${locale}/topsecret/`,`/topsecret/`);
    return NextResponse.json({id:data.id,email:data.invitee_email,code:data.referral_code,shareUrl});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Kunde inte skapa inbjudan.'},{status:500});
  }
}
