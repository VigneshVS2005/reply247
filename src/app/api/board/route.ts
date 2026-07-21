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

  const board = await getDbData('board');
  return NextResponse.json({ board: board || { text: '', updatedAt: '' } });
}

export async function POST(request: Request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { board } = await request.json();
    if (typeof board !== 'object' || board === null) {
      return NextResponse.json({ error: 'Invalid data format. Expected an object.' }, { status: 400 });
    }
    await saveDbData('board', board);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
