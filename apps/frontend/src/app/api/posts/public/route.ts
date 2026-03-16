import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/posts/public - Public paginated posts, no auth required.
// Forwards all query params (post_type_id, limit, offset, sortBy, order, search) to the backend.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_CONFIG.BACKEND_URL}/api/posts/public?${queryString}`
      : `${API_CONFIG.BACKEND_URL}/api/posts/public`;

    const response = await fetch(url, { cache: 'no-store' });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Public posts fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
