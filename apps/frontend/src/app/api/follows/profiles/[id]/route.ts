/**
 * Proxy: POST/DELETE /api/follows/profiles/[id]
 * Requires auth cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

async function handler(request: NextRequest, { params }: { params: Promise<{ id: string }> }, method: string) {
  const { id } = await params;
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/follows/profiles/${id}`, {
      method,
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handler(request, ctx, 'POST');
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handler(request, ctx, 'DELETE');
}
