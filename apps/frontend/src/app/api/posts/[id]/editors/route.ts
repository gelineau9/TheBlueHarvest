/**
 * Post Editors API Proxy Routes
 *
 * Proxies editor management requests to the backend.
 * Routes:
 *   GET    /api/posts/[id]/editors     - List editors for a post
 *   POST   /api/posts/[id]/editors     - Add an editor (owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/posts/[id]/editors - List all editors for a post
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/editors`, {
      cache: 'no-store',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to fetch editors' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching post editors:', error);
    return NextResponse.json({ message: 'An error occurred while fetching editors' }, { status: 500 });
  }
}

// POST /api/posts/[id]/editors - Add an editor to a post
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/editors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to add editor' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding post editor:', error);
    return NextResponse.json({ message: 'An error occurred while adding the editor' }, { status: 500 });
  }
}
