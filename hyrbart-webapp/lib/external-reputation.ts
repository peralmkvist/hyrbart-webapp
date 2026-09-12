import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type VerifiedExternalReputation = {
  id: string;
  sourcePlatform: 'hygglo'|'other';
  sourceProfileUrl: string;
  rating: number|null;
  reviewCount: number|null;
  verifiedAt: string|null;
  verificationMethod: string|null;
};

export async function getVerifiedExternalReputation(userId:string):Promise<VerifiedExternalReputation[]> {
  const admin=createAdminClient();
  const {data,error}=await admin
    .from('external_reputation_claims')
    .select('id,source_platform,source_profile_url,verified_rating,verified_review_count,verified_at,verification_method')
    .eq('user_id',userId)
    .eq('status','verified')
    .order('verified_at',{ascending:false});
  if(error){
    console.error('Could not load verified external reputation',error);
    return [];
  }
  return (data||[]).map((row:any)=>({
    id:row.id,
    sourcePlatform:row.source_platform,
    sourceProfileUrl:row.source_profile_url,
    rating:row.verified_rating==null?null:Number(row.verified_rating),
    reviewCount:row.verified_review_count==null?null:Number(row.verified_review_count),
    verifiedAt:row.verified_at,
    verificationMethod:row.verification_method,
  }));
}
