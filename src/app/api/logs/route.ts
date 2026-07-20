import { NextResponse } from 'next/server';
import { getDbData, saveDbData } from '@/lib/db';

function authenticate(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const passcode = authHeader.split(' ')[1];
  const expected = process.env.ACCESS_CODE;
  return expected && passcode === expected;
}

export async function GET(request: Request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await getDbData('logs');
  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { logs } = await request.json();
    if (!Array.isArray(logs)) {
      return NextResponse.json({ error: 'Invalid data format. Expected an array.' }, { status: 400 });
    }
    await saveDbData('logs', logs);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
