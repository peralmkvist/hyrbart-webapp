import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function GET() {
  const icon = React.createElement(
    'div',
    { style: { width:'180px', height:'180px', display:'flex', alignItems:'center', justifyContent:'center', background:'#ffffff' } },
    React.createElement(
      'svg',
      { width:180, height:180, viewBox:'0 0 512 512', xmlns:'http://www.w3.org/2000/svg' },
      React.createElement('rect', { width:512, height:512, rx:112, fill:'#ffffff' }),
      React.createElement('rect', { x:132, y:98, width:62, height:246, rx:18, fill:'#111111' }),
      React.createElement('rect', { x:318, y:98, width:62, height:246, rx:18, fill:'#111111' }),
      React.createElement('rect', { x:174, y:192, width:164, height:58, rx:18, fill:'#111111' }),
      React.createElement('rect', { x:132, y:360, width:248, height:22, rx:11, fill:'#ffcc00' }),
    ),
  );

  return new ImageResponse(icon, {
    width:180,
    height:180,
    headers:{ 'Content-Type':'image/png', 'Cache-Control':'no-store, max-age=0' },
  });
}
