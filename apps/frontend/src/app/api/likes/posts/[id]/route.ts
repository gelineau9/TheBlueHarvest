/**
 * Post Likes API Proxy
 *
 * Proxies like/unlike requests for posts to the backend.
 * Routes:
 *   POST   /api/likes/posts/[id] - Like a post
 *   DELETE /api/likes/posts/[id] - Unlike a post
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/likes/posts/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to like post' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error liking post:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/likes/posts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to unlike post' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error unliking post:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}
