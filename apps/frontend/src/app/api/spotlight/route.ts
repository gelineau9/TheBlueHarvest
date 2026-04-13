import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/spotlight — public, no auth required
export async function GET() {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/spotlight`, {
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Spotlight fetch error:', error);
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 503 });
  }
}
