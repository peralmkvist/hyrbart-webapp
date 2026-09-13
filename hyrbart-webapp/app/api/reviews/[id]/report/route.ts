import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit } from '@/lib/rate-limit';

const REASONS = new Set(['harassment','hate','personal_data','false_information','irrelevant','other']);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});

  const rate=await consumeRateLimit(request,`review-report:${user.id}`,10,3600);
  if(!rate.allowed)return NextResponse.json({error:'RATE_LIMITED',resetAt:rate.resetAt},{status:429});

  const {id}=await params;
  const body=await request.json().catch(()=>({}));
  const reason=String(body.reason||'');
  const details=String(body.details||'').trim().slice(0,1000);
  if(!REASONS.has(reason))return NextResponse.json({error:'INVALID_REASON'},{status:400});
  if(reason==='other'&&details.length<5)return NextResponse.json({error:'DETAILS_REQUIRED'},{status:400});

  const admin=createAdminClient();
  const {data:review,error:reviewError}=await admin.from('booking_reviews')
    .select('id,booking_id,reviewer_id,moderation_status')
    .eq('id',id).maybeSingle();
  if(reviewError)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  if(!review||review.moderation_status==='hidden')return NextResponse.json({error:'NOT_FOUND'},{status:404});
  if(review.reviewer_id===user.id)return NextResponse.json({error:'CANNOT_REPORT_OWN_REVIEW'},{status:400});

  const [{data:booking,error:bookingError},{count:visibleReviewCount,error:countError}]=await Promise.all([
    admin.from('bookings').select('status,completed_at,updated_at,created_at').eq('id',review.booking_id).maybeSingle(),
    admin.from('booking_reviews').select('id',{count:'exact',head:true}).eq('booking_id',review.booking_id).neq('moderation_status','hidden'),
  ]);
  if(bookingError||countError)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  if(!booking||booking.status!=='completed')return NextResponse.json({error:'NOT_PUBLISHED'},{status:404});
  const completedAt=new Date(booking.completed_at||booking.updated_at||booking.created_at).getTime();
  const revealed=(visibleReviewCount||0)>=2||Date.now()>completedAt+WEEK_MS;
  if(!revealed)return NextResponse.json({error:'NOT_PUBLISHED'},{status:404});

  const {error}=await admin.from('review_reports').insert({
    review_id:id,
    reporter_id:user.id,
    reason,
    details:details||null,
  });
  if(error?.code==='23505')return NextResponse.json({error:'ALREADY_REPORTED'},{status:409});
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});
  return NextResponse.json({ok:true},{status:201});
}
