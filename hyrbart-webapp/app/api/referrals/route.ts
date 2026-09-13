import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function makeCode(){return crypto.randomUUID().replace(/-/g,'').slice(0,12);}
function esc(value:string){return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));}

type ReferralRow={id:string;invitee_email:string;referral_code:string};

export async function GET(){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Not authenticated'},{status:401});

    const {data,error}=await supabase.from('host_referrals')
      .select('id,invitee_email,referral_code,reward_sek,signed_up_at,qualified_at,created_at')
      .eq('inviter_user_id',user.id)
      .order('created_at',{ascending:false});
    if(error)throw error;

    const referrals=(data??[]).map(row=>({
      id:row.id,
      email:row.invitee_email,
      code:row.referral_code,
      rewardSek:row.reward_sek,
      invitedAt:row.created_at,
      signedUpAt:row.signed_up_at,
      qualifiedAt:row.qualified_at,
      status:row.qualified_at?'rewarded':row.signed_up_at?'registered':'invited',
    }));
    const earnedSek=referrals.reduce((sum,row)=>sum+(row.status==='rewarded'?Number(row.rewardSek||0):0),0);

    return NextResponse.json({referrals,earnedSek});
  }catch(error){
    console.error('Referral progress load failed',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Kunde inte hämta värvningar.'},{status:500});
  }
}

export async function POST(request:Request){
  try{
    const apiKey=process.env.RESEND_API_KEY;
    if(!apiKey)return NextResponse.json({error:'E-postutskick är inte konfigurerat ännu.'},{status:503});

    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Not authenticated'},{status:401});

    const body=await request.json() as {email?:string;locale?:string};
    const locale=body.locale==='en'?'en':'sv';
    const en=locale==='en';
    const email=String(body.email||'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:en?'Invalid email address.':'Ogiltig e-postadress'},{status:400});
    if(user.email?.toLowerCase()===email)return NextResponse.json({error:en?'You cannot refer yourself.':'Du kan inte värva dig själv.'},{status:400});

    const {data:profile}=await supabase.from('profiles').select('display_name').eq('id',user.id).maybeSingle();
    const inviterName=String(profile?.display_name||'').trim()||(en?'A Hyrbart user':'En Hyrbart-användare');

    let referral:ReferralRow|null=null;
    const {data:existing}=await supabase.from('host_referrals')
      .select('id,invitee_email,referral_code')
      .eq('inviter_user_id',user.id)
      .ilike('invitee_email',email)
      .is('qualified_at',null)
      .maybeSingle();
    if(existing)referral=existing as ReferralRow;

    if(!referral){
      const {data,error}=await supabase.from('host_referrals')
        .insert({inviter_user_id:user.id,invitee_email:email,referral_code:makeCode(),reward_sek:10})
        .select('id,invitee_email,referral_code').single();
      if(error){
        if(error.code==='23505')return NextResponse.json({error:en?'There is already an active invitation for this email address.':'Det finns redan en aktiv inbjudan till den här e-postadressen.'},{status:409});
        throw error;
      }
      referral=data as ReferralRow;
    }

    const origin=new URL(request.url).origin;
    const shareUrl=`${origin}/topsecret/${locale}/logga-in?ref=${encodeURIComponent(referral.referral_code)}`;
    const safeName=esc(inviterName);
    const safeUrl=esc(shareUrl);
    const subject=en?`${inviterName} invited you to Hyrbart`:`${inviterName} har bjudit in dig till Hyrbart`;
    const intro=en?`${safeName} thinks Hyrbart could be useful for you.`:`${safeName} tror att Hyrbart skulle passa dig.`;
    const reward=en?'When you complete your first rental as a host, you both receive SEK 10.':'När du genomför din första uthyrning som uthyrare får ni 10 kr var.';
    const cta=en?'Start renting out':'Börja hyra ut';
    const text=en
      ?`${inviterName} invited you to Hyrbart.\n\n${reward}\n\nSign up here: ${shareUrl}\n\nYou received this email because ${inviterName} invited this email address to Hyrbart.`
      :`${inviterName} har bjudit in dig till Hyrbart.\n\n${reward}\n\nRegistrera dig här: ${shareUrl}\n\nDu får det här mejlet eftersom ${inviterName} bjöd in den här e-postadressen till Hyrbart.`;
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body style="margin:0;background-color:#f5f5f3;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td align="center" style="padding-top:32px;padding-right:16px;padding-bottom:32px;padding-left:16px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;background-color:#ffffff;border-radius:24px;"><tr><td bgcolor="#ffcc00" style="background-color:#ffcc00;padding-top:22px;padding-right:28px;padding-bottom:22px;padding-left:28px;border-top-left-radius:24px;border-top-right-radius:24px;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:32px;color:#111111;font-weight:700;">Hyrbart</p></td></tr><tr><td style="padding-top:34px;padding-right:28px;padding-bottom:34px;padding-left:28px;"><p style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#6b7280;">${intro}</p><p style="margin-top:0;margin-right:0;margin-bottom:14px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:37px;color:#111111;font-weight:700;">${en?'SEK 10 for each of you':'10 kr till er båda'}</p><p style="margin-top:0;margin-right:0;margin-bottom:28px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:26px;color:#111111;">${reward}</p><table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td bgcolor="#111111" style="background-color:#111111;border-radius:14px;"><a href="${safeUrl}" style="display:inline-block;padding-top:15px;padding-right:24px;padding-bottom:15px;padding-left:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#ffffff;text-decoration:none;font-weight:700;">${cta} →</a></td></tr></table><p style="margin-top:30px;margin-right:0;margin-bottom:0;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#8a8f98;">${en?'You received this email because someone invited your email address to Hyrbart.':'Du får det här mejlet eftersom någon bjöd in din e-postadress till Hyrbart.'}</p></td></tr></table></td></tr></table></body></html>`;

    const resendResponse=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:'Hyrbart <hej@hyrbart.se>',to:[email],subject,html,text,tags:[{name:'category',value:'host_referral'}]}),
    });
    const resendData=await resendResponse.json().catch(()=>({})) as {id?:string;message?:string;error?:{message?:string}};
    if(!resendResponse.ok){
      const detail=resendData.message||resendData.error?.message;
      console.error('Referral email failed',detail||resendResponse.status);
      return NextResponse.json({error:en?'The invitation was created, but the email could not be sent. Try again.':'Inbjudan skapades, men mejlet kunde inte skickas. Försök igen.',id:referral.id,email:referral.invitee_email,code:referral.referral_code,shareUrl},{status:502});
    }

    return NextResponse.json({id:referral.id,email:referral.invitee_email,code:referral.referral_code,shareUrl,emailId:resendData.id,sent:true});
  }catch(error){
    console.error('Referral invite failed',error);
    return NextResponse.json({error:error instanceof Error?error.message:'Kunde inte skicka inbjudan.'},{status:500});
  }
}
