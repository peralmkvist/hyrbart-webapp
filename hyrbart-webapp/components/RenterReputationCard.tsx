import { getCompletedRentalCount, getPublicReviewsForUser, getUserReviewSummary } from '@/lib/review-summaries';

function score(value:number|null){return value==null?'–':value.toFixed(1).replace('.',',')}

export default async function RenterReputationCard({userId,name,verified,locale}:{userId:string;name:string;verified:boolean;locale:string}){
  const en=locale==='en';
  const [summary,reviews,rentals]=await Promise.all([
    getUserReviewSummary(userId,'renter'),
    getPublicReviewsForUser(userId,'renter'),
    getCompletedRentalCount(userId,'renter'),
  ]);
  return <section className="renterReputationCard" aria-label={en?'Renter reputation':'Hyrestagarens omdömen'}>
    <div className="renterReputationHead"><div><span>{en?'RENTER HISTORY':'HYRESTAGARHISTORIK'}</span><h2>{name}</h2></div>{verified?<b>✓ {en?'Verified':'Verifierad'}</b>:null}</div>
    {summary.count>0?<>
      <div className="renterReputationMetrics">
        <div><strong>★ {score(summary.overall)}</strong><span>{summary.count} {en?'reviews':'omdömen'}</span></div>
        <div><strong>{score(summary.communication)}</strong><span>{en?'Communication':'Kommunikation'}</span></div>
        <div><strong>{score(summary.handover)}</strong><span>{en?'Handover':'Överlämning'}</span></div>
        <div><strong>{score(summary.returnCondition)}</strong><span>{en?'Return condition':'Skick vid återlämning'}</span></div>
      </div>
      <div className="renterReputationMeta"><span>{rentals} {en?'completed rentals':'slutförda hyror'}</span>{summary.recommendPersonPercent!=null?<span>{summary.recommendPersonPercent}% {en?'would recommend':'rekommenderar'}</span>:null}</div>
      {summary.topTags.length?<div className="renterReputationTags">{summary.topTags.map(tag=><span key={tag}>{tag}</span>)}</div>:null}
      {reviews.some(r=>r.comment)?<div className="renterReputationReviews">{reviews.filter(r=>r.comment).slice(0,3).map((review,index)=><blockquote key={`${review.submittedAt}-${index}`}><div><strong>★ {review.overall}</strong><span>{review.reviewerName}</span></div><p>{review.comment}</p></blockquote>)}</div>:null}
    </>:<div className="renterReputationEmpty"><strong>{en?'No reviews yet':'Inga omdömen ännu'}</strong><p>{rentals>0?(en?'This renter has completed rentals but has no published reviews yet.':'Hyrestagaren har slutförda hyror men ännu inga publicerade omdömen.'):(en?'This is a new renter on Hyrbart.':'Det här är en ny hyrestagare på Hyrbart.')}</p></div>}
  </section>;
}
