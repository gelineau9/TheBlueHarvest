import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const url = type ? `${API_CONFIG.BACKEND_URL}/api/profiles?type=${type}` : `${API_CONFIG.BACKEND_URL}/api/profiles`;

    const response = await fetch(url, {
      headers: {
        ...(request.headers.get('authorization') && {
          Authorization: request.headers.get('authorization')!,
        }),
        ...(request.cookies.get('auth_token') && {
          Authorization: `Bearer ${request.cookies.get('auth_token')?.value}`,
        }),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch profiles' }));
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch profiles' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Profiles fetch error:', error);
    return NextResponse.json({ message: 'An error occurred while fetching profiles' }, { status: 500 });
  }
}
