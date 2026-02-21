import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// DELETE /api/collections/:id/posts/:postId - Remove a post from a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, postId } = await params;

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/collections/${id}/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error removing post from collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
