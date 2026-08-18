import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// PATCH /api/users/me/profile - Update the caller's public profile
export async function PATCH(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/users/me/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating public profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
