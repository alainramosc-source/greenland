import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/utils/supabase/server';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

// ============================================================
// GET — Proxy media from Meta (audio, images, videos, documents)
// Meta's media URLs are temporary and require Authorization header
// This endpoint proxies them so the browser can access them
// ============================================================
export async function GET(request) {
  try {
    // Verify authenticated user
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('id');

    if (!mediaId) {
      return NextResponse.json({ error: 'Media id is required' }, { status: 400 });
    }

    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'WhatsApp token not configured' }, { status: 500 });
    }

    // Step 1: Get the download URL from Meta
    const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const metaData = await metaRes.json();

    if (!metaData.url) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Step 2: Download the actual binary from Meta's CDN
    const mediaRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mediaRes.ok) {
      return NextResponse.json({ error: 'Failed to download media' }, { status: 502 });
    }

    // Step 3: Stream back to the client with correct content type
    const contentType = metaData.mime_type || mediaRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await mediaRes.arrayBuffer();

    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400', // Cache for 24h
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[Media Proxy] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
