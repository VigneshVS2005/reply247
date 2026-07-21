import { NextResponse } from 'next/server';

export async function GET() {
  const redisUrl = process.env.REDIS_URL;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (redisUrl) {
    return NextResponse.json({ status: 'connected', type: 'Redis Store' });
  } else if (url && token) {
    return NextResponse.json({ status: 'connected', type: 'Vercel KV' });
  } else {
    return NextResponse.json({ status: 'fallback', type: 'Local JSON File' });
  }
}
