import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '180px',
          height: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius: '40px',
        }}
      >
        <div style={{ position: 'relative', width: '104px', height: '112px', display: 'flex' }}>
          <div style={{ position: 'absolute', left: '9px', top: '6px', width: '23px', height: '82px', borderRadius: '7px', background: '#111111' }} />
          <div style={{ position: 'absolute', right: '9px', top: '6px', width: '23px', height: '82px', borderRadius: '7px', background: '#111111' }} />
          <div style={{ position: 'absolute', left: '27px', top: '39px', width: '50px', height: '21px', borderRadius: '7px', background: '#111111' }} />
          <div style={{ position: 'absolute', left: '9px', top: '96px', width: '86px', height: '8px', borderRadius: '4px', background: '#ffcc00' }} />
        </div>
      </div>
    ),
    size,
  );
}
