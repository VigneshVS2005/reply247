import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { passcode } = await request.json();
    const expected = process.env.ACCESS_CODE;

    if (!expected || passcode !== expected) {
      return NextResponse.json({ authenticated: false, error: 'Incorrect passcode' }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
