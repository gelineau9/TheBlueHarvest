/**
 * Proxy: GET /api/activity
 * Public — no auth required. Forwards limit/offset query params.
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_CONFIG.BACKEND_URL}/api/activity?${queryString}`
      : `${API_CONFIG.BACKEND_URL}/api/activity`;

    const response = await fetch(url, { cache: 'no-store' });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
