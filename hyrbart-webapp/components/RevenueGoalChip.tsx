'use client';

import { useEffect, useMemo, useState } from 'react';

type GoalData={revenue:number;target:number|null;percent:number|null};
function currentMonth(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
const trackStyle={height:8,borderRadius:999,background:'#e5e5e0',overflow:'hidden',marginTop:10} as const;
const fillStyle={display:'block',height:'100%',borderRadius:999,background:'var(--ink)'} as const;
export default function RevenueGoalChip({locale='sv'}:{locale?:string}){const en=locale==='en',fmt=useMemo(()=>new Intl.NumberFormat(en?'en-GB':'sv-SE'),[en]),[data,setData]=useState<GoalData|null>(null);useEffect(()=>{let live=true;fetch(`/api/host-revenue-goal?month=${currentMonth()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(v=>{if(live)setData(v)}).catch(()=>{});return()=>{live=false}},[]);if(!data)return <><p>{en?'Economy and payouts':'Ekonomi och utbetalningar'}</p><div className="profileBars" aria-hidden="true"><i/><i/><i/><i/><i/></div></>;if(!data.target)return <><p>{en?`${fmt.format(data.revenue)} SEK this month · no goal set`:`${fmt.format(data.revenue)} kr denna månad · inget mål satt`}</p><div style={trackStyle} aria-hidden="true"><span style={{...fillStyle,width:'0%'}}/></div></>;const pct=Math.max(0,Math.min(100,Math.round(data.revenue/data.target*100)));return <><p>{en?`${fmt.format(data.revenue)} of ${fmt.format(data.target)} SEK · ${data.percent}%`:`${fmt.format(data.revenue)} av ${fmt.format(data.target)} kr · ${data.percent} %`}</p><div style={trackStyle} role="progressbar" aria-label={en?'Revenue goal progress':'Måluppfyllelse'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{...fillStyle,width:`${pct}%`}}/></div></>}
