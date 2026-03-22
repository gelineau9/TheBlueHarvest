/**
 * Post Featured Profile Delete API Proxy Route
 *
 * Proxies featured profile removal requests to the backend.
 * Route:
 *   DELETE /api/posts/[id]/featured/[featuredId] - Remove a featured profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// DELETE /api/posts/[id]/featured/[featuredId] - Remove a featured profile from a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; featuredId: string }> },
) {
  try {
    const { id, featuredId } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/featured/${featuredId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.error || 'Failed to remove featured profile' },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error removing featured profile from post:', error);
    return NextResponse.json({ message: 'An error occurred while removing the featured profile' }, { status: 500 });
  }
}
