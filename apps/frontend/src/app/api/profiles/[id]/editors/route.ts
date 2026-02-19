/**
 * Profile Editors API Proxy Routes
 *
 * Proxies editor management requests to the backend.
 * Routes:
 *   GET    /api/profiles/[id]/editors     - List editors for a profile
 *   POST   /api/profiles/[id]/editors     - Add an editor (owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/profiles/[id]/editors - List all editors for a profile
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}/editors`, {
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to fetch editors' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching profile editors:', error);
    return NextResponse.json({ message: 'An error occurred while fetching editors' }, { status: 500 });
  }
}

// POST /api/profiles/[id]/editors - Add an editor to a profile
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}/editors`, {
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
    console.error('Error adding profile editor:', error);
    return NextResponse.json({ message: 'An error occurred while adding the editor' }, { status: 500 });
  }
}
