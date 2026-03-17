/**
 * Post Featured Profiles API Proxy Routes
 *
 * Proxies featured profile management requests to the backend.
 * Routes:
 *   POST   /api/posts/[id]/featured     - Add a featured profile (owner/editor only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// POST /api/posts/[id]/featured - Add a featured profile to a post
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/featured`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to add featured profile' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding featured profile to post:', error);
    return NextResponse.json({ message: 'An error occurred while adding the featured profile' }, { status: 500 });
  }
}
