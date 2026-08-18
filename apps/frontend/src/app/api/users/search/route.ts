import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/users/search?q= - Username suggestions for editor pickers
export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q') ?? '';

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/users/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error searching usernames:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
