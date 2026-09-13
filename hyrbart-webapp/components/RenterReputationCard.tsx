import { getCompletedRentalCount, getPublicReviewsForUser, getUserReviewSummary } from '@/lib/review-summaries';
import { getVerifiedExternalReputation } from '@/lib/external-reputation';

function score(value:number|null){return value==null?'–':value.toFixed(1).replace('.',',')}

export default async function RenterReputationCard({userId,name,verified,locale}:{userId:string;name:string;verified:boolean;locale:string}){
  const en=locale==='en';
  const [summary,reviews,rentals,external]=await Promise.all([
    getUserReviewSummary(userId,'renter'),
    getPublicReviewsForUser(userId,'renter'),
    getCompletedRentalCount(userId,'renter'),
    getVerifiedExternalReputation(userId),
  ]);
  return <section className="renterReputationCard" aria-label={en?'Renter reputation':'Hyrestagarens omdömen'}>
    <div className="renterReputationHead"><div><span>{en?'RENTER HISTORY':'HYRESTAGARHISTORIK'}</span><h2>{name}</h2></div>{verified?<b>✓ {en?'Verified identity':'Verifierad identitet'}</b>:null}</div>
    {summary.count>0?<>
      <div className="renterReputationMetrics">
        <div><strong>★ {score(summary.overall)}</strong><span>{summary.count} {en?'Hyrbart reviews':'Hyrbart-omdömen'}</span></div>
        <div><strong>{score(summary.communication)}</strong><span>{en?'Communication':'Kommunikation'}</span></div>
        <div><strong>{score(summary.handover)}</strong><span>{en?'Handover':'Överlämning'}</span></div>
        <div><strong>{score(summary.returnCondition)}</strong><span>{en?'Return condition':'Skick vid återlämning'}</span></div>
      </div>
      <div className="renterReputationMeta"><span>{rentals} {en?'completed Hyrbart rentals':'slutförda Hyrbart-hyror'}</span>{summary.recommendPersonPercent!=null?<span>{summary.recommendPersonPercent}% {en?'would recommend':'rekommenderar'}</span>:null}</div>
      {summary.topTags.length?<div className="renterReputationTags">{summary.topTags.map(tag=><span key={tag}>{tag}</span>)}</div>:null}
      {reviews.some(r=>r.comment)?<div className="renterReputationReviews">{reviews.filter(r=>r.comment).slice(0,3).map((review,index)=><blockquote key={`${review.submittedAt}-${index}`}><div><strong>★ {review.overall}</strong><span>{review.reviewerName}</span></div><p>{review.comment}</p></blockquote>)}</div>:null}
    </>:<div className="renterReputationEmpty"><strong>{en?'No Hyrbart reviews yet':'Inga Hyrbart-omdömen ännu'}</strong><p>{rentals>0?(en?'This renter has completed Hyrbart rentals but has no published reviews yet.':'Hyrestagaren har slutförda Hyrbart-hyror men ännu inga publicerade omdömen.'):(en?'This is a new renter on Hyrbart.':'Det här är en ny hyrestagare på Hyrbart.')}</p></div>}

    {external.length?<div style={{marginTop:18,paddingTop:18,borderTop:'1px solid var(--line)'}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12,marginBottom:10}}><strong>{en?'Verified history from other platforms':'Verifierad historik från andra plattformar'}</strong><small>{en?'Not included in Hyrbart score':'Ingår inte i Hyrbart-betyget'}</small></div>
      <div style={{display:'grid',gap:8}}>{external.map(item=><a key={item.id} href={item.sourceProfileUrl} target="_blank" rel="noreferrer" style={{display:'flex',justifyContent:'space-between',gap:12,padding:'10px 0',color:'inherit',textDecoration:'none'}}><span><b>{item.sourcePlatform==='hygglo'?'Hygglo':(en?'External platform':'Extern plattform')}</b><small style={{display:'block',marginTop:2}}>✓ {en?'Verified by Hyrbart':'Verifierad av Hyrbart'}</small></span><strong>{item.rating!=null?`★ ${item.rating.toFixed(1).replace('.',',')}`:'✓'}{item.reviewCount!=null?` · ${item.reviewCount} ${en?'reviews':'omdömen'}`:''}</strong></a>)}</div>
    </div>:null}
  </section>;
}
