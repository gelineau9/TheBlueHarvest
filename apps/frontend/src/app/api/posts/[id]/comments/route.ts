/**
 * Post Comments API Proxy Routes
 *
 * Proxies comment requests to the backend.
 * Routes:
 *   GET    /api/posts/[id]/comments     - List comments for a post
 *   POST   /api/posts/[id]/comments     - Create a comment (authenticated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/posts/[id]/comments - List all comments for a post
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/comments`, {
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to fetch comments' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching post comments:', error);
    return NextResponse.json({ message: 'An error occurred while fetching comments' }, { status: 500 });
  }
}

// POST /api/posts/[id]/comments - Create a comment
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to create comment' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ message: 'An error occurred while creating the comment' }, { status: 500 });
  }
}
