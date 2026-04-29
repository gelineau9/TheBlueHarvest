import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    const response = await fetch(
      `${API_CONFIG.BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Invalid or expired verification token' },
        { status: response.status },
      );
    }

    // Verification succeeded — set the auth cookie so the user is logged in immediately
    const cookieStore = await cookies();
    await cookieStore.set({
      name: 'auth_token',
      value: data.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days — matches JWT expiry
    });

    return NextResponse.json({ success: true, message: data.message });
  } catch (error) {
    console.error('[verify-email route] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
