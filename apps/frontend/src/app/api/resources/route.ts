import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/resources?type=guide — public list
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const query = type ? `?type=${encodeURIComponent(type)}` : '';

  try {
    // The sidebar requests this on every page load. Caching the upstream call
    // keeps that from becoming one backend request per page view — anonymous
    // traffic all shares a single proxy-IP rate-limit bucket.
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/resources${query}`, {
      next: { revalidate: 300 },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Resources list error:', error);
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 503 });
  }
}

// POST /api/resources — create (auth required)
export async function POST(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Resource create error:', error);
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 503 });
  }
}
