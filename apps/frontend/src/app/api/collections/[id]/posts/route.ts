import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// POST /api/collections/:id/posts - Add a post to a collection
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/collections/${id}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error adding post to collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
