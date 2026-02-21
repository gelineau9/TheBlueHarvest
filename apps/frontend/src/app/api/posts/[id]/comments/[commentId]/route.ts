/**
 * Individual Comment API Proxy Routes
 *
 * Proxies individual comment requests to the backend.
 * Routes:
 *   PUT    /api/posts/[id]/comments/[commentId]  - Edit a comment (authenticated, owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// PUT /api/posts/[id]/comments/[commentId] - Edit a comment
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const { id, commentId } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to update comment' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ message: 'An error occurred while updating the comment' }, { status: 500 });
  }
}
