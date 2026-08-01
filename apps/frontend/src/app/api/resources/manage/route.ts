import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/resources/manage?type=guide — author/staff list including drafts
export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type');
  const query = type ? `?type=${encodeURIComponent(type)}` : '';

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/resources/manage${query}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Resources manage error:', error);
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 503 });
  }
}
