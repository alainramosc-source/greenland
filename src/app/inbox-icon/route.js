import { ImageResponse } from 'next/og';

export async function GET(request) {
  const size = new URL(request.url).searchParams.get('size') === '512' ? 512 : 192;
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6a9a04', color: 'white', fontSize: size * 0.58, fontWeight: 900 }}>G</div>,
    { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
