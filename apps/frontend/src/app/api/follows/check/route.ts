/**
 * Proxy: GET /api/follows/check
 * Requires auth cookie. Forwards profileIds/accountIds query params.
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json({ accounts: {}, profiles: {} }, { status: 200 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_CONFIG.BACKEND_URL}/api/follows/check?${queryString}`
      : `${API_CONFIG.BACKEND_URL}/api/follows/check`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
