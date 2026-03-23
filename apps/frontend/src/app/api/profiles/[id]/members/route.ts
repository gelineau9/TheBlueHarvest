/**
 * Kinship Members API Proxy Routes
 *
 * Proxies member management requests to the backend.
 * Routes:
 *   GET  /api/profiles/[id]/members - List members of a kinship
 *   POST /api/profiles/[id]/members - Add a character to a kinship
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/profiles/[id]/members - List all members of a kinship
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}/members`, {
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json') ? await response.json() : {};

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to fetch members' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching kinship members:', error);
    return NextResponse.json({ message: 'An error occurred while fetching members' }, { status: 500 });
  }
}

// POST /api/profiles/[id]/members - Add a character to a kinship
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json') ? await response.json() : {};

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to add member' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding kinship member:', error);
    return NextResponse.json({ message: 'An error occurred while adding the member' }, { status: 500 });
  }
}
