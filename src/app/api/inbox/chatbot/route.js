import { NextResponse } from 'next/server';

// Retired HTTP entry point. Meta uses processBotMessage directly in webhook/route.js.
export async function POST() {
  return NextResponse.json({ error: 'Endpoint retirado.' }, { status: 410 });
}
