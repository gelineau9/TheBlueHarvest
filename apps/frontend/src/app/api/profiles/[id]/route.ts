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

// Update profile endpoint (2.3.2)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update profile' }));
      return NextResponse.json({ message: errorData.error || 'Failed to update profile' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ message: 'An error occurred while updating the profile' }, { status: 500 });
  }
}

// DELETE /api/profiles/:id - Soft delete a profile (2.4.2)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to delete profile' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Profile deletion error:', error);
    return NextResponse.json({ message: 'An error occurred while deleting the profile' }, { status: 500 });
  }
}
