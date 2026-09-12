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
        background: '#01453A',
        borderRadius: '40px',
        overflow: 'hidden',
      },
    },
    React.createElement(
      'svg',
      { width: 180, height: 180, viewBox: '0 0 1024 1024', xmlns: 'http://www.w3.org/2000/svg' },
      React.createElement('rect', { x: 0, y: 0, width: 1024, height: 1024, rx: 190, fill: '#01453A' }),
      React.createElement('path', { d: 'M210 505 512 230 814 505v278c0 36-29 65-65 65H275c-36 0-65-29-65-65V505Z', fill: 'none', stroke: '#FCF9F3', strokeWidth: 76, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      React.createElement('path', { d: 'M722 420V330h88v172', fill: 'none', stroke: '#FCF9F3', strokeWidth: 76, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      React.createElement(
        'g',
        { transform: 'rotate(-45 520 610)' },
        React.createElement('path', { d: 'M405 435h230c28 0 50 22 50 50v282c0 28-22 50-50 50H405c-28 0-50-22-50-50V485c0-28 22-50 50-50Z', fill: '#C0FF00' }),
        React.createElement('circle', { cx: 620, cy: 505, r: 31, fill: '#01453A' }),
      ),
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
