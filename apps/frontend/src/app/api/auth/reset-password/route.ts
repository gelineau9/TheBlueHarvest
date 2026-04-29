import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: body.token, newPassword: body.newPassword }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error || data.message || 'Password reset failed',
          errorCode: data.error,
        },
        { status: response.status },
      );
    }

    // Clear any existing session — the user should log in fresh after a password reset
    const cookieStore = await cookies();
    await cookieStore.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return NextResponse.json({ success: true, message: data.message });
  } catch (error) {
    console.error('[reset-password route] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
