import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const WINDOW_MS=7*24*60*60*1000;
const ratingKeys=['communication','overall_rating'] as const;
function validRating(v:unknown){return Number.isInteger(v)&&Number(v)>=1&&Number(v)<=5}
function completionTime(booking:{completed_at?:string|null;updated_at?:string|null;created_at:string}){return new Date(booking.completed_at||booking.updated_at||booking.created_at).getTime()}
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
 const {data:b}=await supabase.from('bookings').select('id,renter_id,owner_id,status,completed_at,updated_at,created_at').eq('id',id).maybeSingle();
 if(!b||![b.renter_id,b.owner_id].includes(user.id))return NextResponse.json({error:'NOT_FOUND'},{status:404});
 // Participant access has already been verified above. Read reviews with the
 // server-side admin client so the double-blind response is decided here,
 // rather than by the self-referencing booking_reviews SELECT RLS policy.
 const admin=createAdminClient();
 const {data:reviews,error:reviewsError}=await admin.from('booking_reviews').select('*').eq('booking_id',id);
 if(reviewsError){console.error('Review read failed',reviewsError);return NextResponse.json({error:'REVIEW_READ_FAILED'},{status:500});}
 const all=reviews||[]; const mine=all.find(r=>r.reviewer_id===user.id)||null; const theirs=all.find(r=>r.reviewer_id!==user.id)||null;
 const deadline=new Date(completionTime(b)+WINDOW_MS); const expired=Date.now()>deadline.getTime();
 const reveal=Boolean(mine&&theirs)||expired;
 const revealed=reveal?all.filter(r=>r.moderation_status!=='hidden'||r.reviewer_id===user.id):[];
 return NextResponse.json({eligible:b.status==='completed'&&!expired&&!mine,submitted:Boolean(mine),counterpartSubmitted:Boolean(theirs),deadline:deadline.toISOString(),mine,revealed});
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
 const {data:b}=await supabase.from('bookings').select('id,renter_id,owner_id,status,completed_at,updated_at,created_at').eq('id',id).maybeSingle(); if(!b||![b.renter_id,b.owner_id].includes(user.id))return NextResponse.json({error:'NOT_FOUND'},{status:404});
 if(b.status!=='completed'||Date.now()>completionTime(b)+WINDOW_MS)return NextResponse.json({error:'REVIEW_WINDOW_CLOSED'},{status:409});
 const body=await req.json(); const role=b.renter_id===user.id?'renter':'owner';
 if(!ratingKeys.every(k=>validRating(body[k])))return NextResponse.json({error:'INVALID_RATING'},{status:400});
 const roleRatings=role==='renter'?[body.condition_rating,body.function_rating]:[body.handover_rating,body.return_condition_rating]; if(!roleRatings.every(validRating))return NextResponse.json({error:'INVALID_RATING'},{status:400});
 const all=[body.communication,body.overall_rating,...roleRatings].map(Number); if(Math.min(...all)<=3&&String(body.comment||'').trim().length<10)return NextResponse.json({error:'COMMENT_REQUIRED'},{status:400});
 if(typeof body.recommend_person!=='boolean'||(role==='renter'&&typeof body.recommend_product!=='boolean'))return NextResponse.json({error:'RECOMMENDATION_REQUIRED'},{status:400});
 const row:any={booking_id:id,reviewer_id:user.id,reviewee_id:role==='renter'?b.owner_id:b.renter_id,reviewer_role:role,communication:Number(body.communication),overall_rating:Number(body.overall_rating),communication_tags:body.communication_tags||[],comment:String(body.comment||'').trim()||null,recommend_person:body.recommend_person};
 if(role==='renter')Object.assign(row,{condition_rating:Number(body.condition_rating),function_rating:Number(body.function_rating),condition_tags:body.condition_tags||[],function_tags:body.function_tags||[],recommend_product:body.recommend_product}); else Object.assign(row,{handover_rating:Number(body.handover_rating),return_condition_rating:Number(body.return_condition_rating),handover_tags:body.handover_tags||[],return_condition_tags:body.return_condition_tags||[]});
 const {error}=await supabase.from('booking_reviews').insert(row); if(error)return NextResponse.json({error:error.code==='23505'?'ALREADY_REVIEWED':'SAVE_FAILED'},{status:error.code==='23505'?409:500}); return NextResponse.json({ok:true});
}
