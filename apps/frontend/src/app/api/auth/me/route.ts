import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/actions';

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    return NextResponse.json({
      isLoggedIn: true,
      username: session.username,
      email: session.email,
      avatarUrl: '',
    });
  } catch (err) {
    console.error('Auth check error:', err);
    return NextResponse.json({ isLoggedIn: false }, { status: 500 });
  }
}
