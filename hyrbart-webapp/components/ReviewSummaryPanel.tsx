import type { PublicReview, ReviewSummary } from '@/lib/review-summaries';

type Kind='product'|'owner'|'renter';
function fmt(v:number|null){return v==null?'–':v.toFixed(1).replace('.',',')}
export default function ReviewSummaryPanel({summary,reviews,kind='product',locale='sv'}:{summary:ReviewSummary;reviews:PublicReview[];kind?:Kind;locale?:string}){
 const en=locale==='en'; if(!summary.count)return null;
 const metrics=kind==='product'?[['Skick','Condition',summary.condition],['Funktion','Function',summary.function],['Kommunikation','Communication',summary.communication]]:kind==='owner'?[['Kommunikation','Communication',summary.communication]]:[['Kommunikation','Communication',summary.communication],['Överlämning','Handover',summary.handover],['Skick vid återlämning','Return condition',summary.returnCondition]];
 const recommend=kind==='product'?summary.recommendProductPercent:summary.recommendPersonPercent;
 return <section className="reviewSummaryPanel"><div className="reviewSummaryHead"><div><span aria-hidden="true">★</span><strong>{fmt(summary.overall)}</strong><small>{summary.count} {en?'reviews':'omdömen'}</small></div>{recommend!=null?<div className="reviewRecommendScore"><strong>{recommend}%</strong><span>{en?'would recommend':'skulle rekommendera'}</span></div>:null}</div><div className="reviewMetricGrid">{metrics.map(([sv,enLabel,value])=>value!=null?<div key={String(sv)}><span>{en?enLabel:sv}</span><strong>{fmt(value as number)}</strong></div>:null)}</div>{summary.topTags.length?<div className="reviewPublicTags">{summary.topTags.map(tag=><span key={tag}>{tag}</span>)}</div>:null}{reviews.some(r=>r.comment)?<div className="reviewPublicList">{reviews.filter(r=>r.comment).slice(0,4).map((r,i)=><article key={`${r.submittedAt}-${i}`}><div><strong>{r.reviewerName}</strong><span>★ {r.overall.toFixed(1).replace('.',',')}</span></div><p>{r.comment}</p></article>)}</div>:null}</section>
}
