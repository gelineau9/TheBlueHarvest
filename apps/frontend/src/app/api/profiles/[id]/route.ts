import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch profile from backend using Docker service name
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}`, {
      headers: {
        // Forward any authorization headers if needed
        ...(request.headers.get('authorization') && {
          Authorization: request.headers.get('authorization')!,
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
