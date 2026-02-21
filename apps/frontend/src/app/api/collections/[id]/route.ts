import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/collections/:id - Get a single collection with authors and posts
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authToken = request.cookies.get('auth_token')?.value;
  const { id } = await params;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/collections/${id}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/collections/:id - Delete a collection
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/collections/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
