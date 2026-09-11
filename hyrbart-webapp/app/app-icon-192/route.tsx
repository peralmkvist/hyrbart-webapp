import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '192px',
          height: '192px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius: '42px',
        }}
      >
        <div style={{ position: 'relative', width: '112px', height: '120px', display: 'flex' }}>
          <div style={{ position: 'absolute', left: '10px', top: '6px', width: '24px', height: '88px', borderRadius: '7px', background: '#111111' }} />
          <div style={{ position: 'absolute', right: '10px', top: '6px', width: '24px', height: '88px', borderRadius: '7px', background: '#111111' }} />
          <div style={{ position: 'absolute', left: '28px', top: '42px', width: '56px', height: '22px', borderRadius: '7px', background: '#111111' }} />
          <div style={{ position: 'absolute', left: '10px', top: '102px', width: '92px', height: '8px', borderRadius: '4px', background: '#ffcc00' }} />
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
