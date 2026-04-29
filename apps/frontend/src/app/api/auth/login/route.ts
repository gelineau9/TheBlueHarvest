import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';
import { loginSchema } from '@/app/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }

    const { email, password } = result.data;

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || 'Login failed',
          errorCode: data.error as string | undefined,
          errorReason: data.reason as string | undefined,
        },
        { status: response.status },
      );
    }

    // Must use nextResponse.cookies.set() in a Route Handler; cookies().set() is the
    // Server Action pattern and does not attach Set-Cookie headers to a returned NextResponse.
    const nextResponse = NextResponse.json({ success: true });
    nextResponse.cookies.set({
      name: 'auth_token',
      value: data.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days — matches JWT expiry
    });

    return nextResponse;
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
