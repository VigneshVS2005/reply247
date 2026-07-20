import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (url && token) {
    return NextResponse.json({ status: 'connected', type: 'Vercel KV' });
  } else {
    return NextResponse.json({ status: 'fallback', type: 'Local JSON File' });
  }
}
