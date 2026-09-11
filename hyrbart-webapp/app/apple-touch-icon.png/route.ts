import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function GET() {
  const icon = React.createElement(
    'div',
    {
      style: {
        width: '180px',
        height: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        borderRadius: '40px',
      },
    },
    React.createElement(
      'div',
      { style: { position: 'relative', width: '104px', height: '112px', display: 'flex' } },
      React.createElement('div', { style: { position: 'absolute', left: '9px', top: '6px', width: '23px', height: '82px', borderRadius: '7px', background: '#111111' } }),
      React.createElement('div', { style: { position: 'absolute', right: '9px', top: '6px', width: '23px', height: '82px', borderRadius: '7px', background: '#111111' } }),
      React.createElement('div', { style: { position: 'absolute', left: '27px', top: '39px', width: '50px', height: '21px', borderRadius: '7px', background: '#111111' } }),
      React.createElement('div', { style: { position: 'absolute', left: '9px', top: '96px', width: '23px', height: '8px', borderRadius: '4px', background: '#ffcc00' } }),
    ),
  );

  return new ImageResponse(icon, {
    width: 180,
    height: 180,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
