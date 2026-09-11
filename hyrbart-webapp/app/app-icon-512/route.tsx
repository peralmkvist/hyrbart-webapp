import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '512px',
          height: '512px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius: '112px',
        }}
      >
        <div style={{ position: 'relative', width: '300px', height: '320px', display: 'flex' }}>
          <div style={{ position: 'absolute', left: '28px', top: '16px', width: '64px', height: '236px', borderRadius: '18px', background: '#111111' }} />
          <div style={{ position: 'absolute', right: '28px', top: '16px', width: '64px', height: '236px', borderRadius: '18px', background: '#111111' }} />
          <div style={{ position: 'absolute', left: '76px', top: '112px', width: '148px', height: '58px', borderRadius: '18px', background: '#111111' }} />
          <div style={{ position: 'absolute', left: '28px', top: '272px', width: '244px', height: '22px', borderRadius: '11px', background: '#ffcc00' }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
