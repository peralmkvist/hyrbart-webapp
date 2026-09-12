import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div style={{width:'512px',height:'512px',display:'flex',alignItems:'center',justifyContent:'center',background:'#01453A',borderRadius:'112px',overflow:'hidden'}}>
        <svg width="512" height="512" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="1024" height="1024" rx="190" fill="#01453A" />
          <path d="M210 505 512 230 814 505v278c0 36-29 65-65 65H275c-36 0-65-29-65-65V505Z" fill="none" stroke="#FCF9F3" strokeWidth="76" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M722 420V330h88v172" fill="none" stroke="#FCF9F3" strokeWidth="76" strokeLinejoin="round" strokeLinecap="round" />
          <g transform="rotate(-45 520 610)">
            <path d="M405 435h230c28 0 50 22 50 50v282c0 28-22 50-50 50H405c-28 0-50-22-50-50V485c0-28 22-50 50-50Z" fill="#C0FF00" />
            <circle cx="620" cy="505" r="31" fill="#01453A" />
          </g>
        </svg>
      </div>
    ),
    { width: 512, height: 512, headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
