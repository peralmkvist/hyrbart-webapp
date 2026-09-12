'use client';

export default function PrintButton({label}:{label:string}){
  return <button type="button" onClick={()=>window.print()} style={{minHeight:46,border:0,borderRadius:14,padding:'0 18px',fontWeight:800,background:'var(--accent)',cursor:'pointer'}}>{label}</button>;
}
