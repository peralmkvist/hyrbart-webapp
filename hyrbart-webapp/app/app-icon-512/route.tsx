import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div style={{width:'512px',height:'512px',display:'flex',alignItems:'center',justifyContent:'center',background:'#ffffff'}}>
        <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="112" fill="#ffffff" />
          <g fill="#111111">
            <rect x="132" y="98" width="62" height="246" rx="18" />
            <rect x="318" y="98" width="62" height="246" rx="18" />
            <rect x="174" y="192" width="164" height="58" rx="18" />
          </g>
          <rect x="132" y="360" width="248" height="22" rx="11" fill="#ffcc00" />
        </svg>
      </div>
    ),
    { width:512, height:512, headers:{ 'Cache-Control':'no-store, max-age=0' } }
  );
}
