import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get auth token from cookie to determine ownership (2.3.1)
    const authToken = request.cookies.get('auth_token')?.value;

    // Fetch profile from backend using Docker service name
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}`, {
      headers: {
        // Forward auth token as Bearer if present (for can_edit check)
        ...(authToken && {
          Authorization: `Bearer ${authToken}`,
        }),
      },
      cache: 'no-store', // Ensure fresh data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Profile not found' }));
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch profile' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ message: 'An error occurred while fetching the profile' }, { status: 500 });
  }
}
