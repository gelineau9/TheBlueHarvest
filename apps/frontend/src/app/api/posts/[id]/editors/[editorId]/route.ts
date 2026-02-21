/**
 * Post Editor Delete API Proxy Route
 *
 * Proxies editor removal requests to the backend.
 * Route:
 *   DELETE /api/posts/[id]/editors/[editorId] - Remove an editor
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// DELETE /api/posts/[id]/editors/[editorId] - Remove an editor
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; editorId: string }> }) {
  try {
    const { id, editorId } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/editors/${editorId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to remove editor' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error removing post editor:', error);
    return NextResponse.json({ message: 'An error occurred while removing the editor' }, { status: 500 });
  }
}
