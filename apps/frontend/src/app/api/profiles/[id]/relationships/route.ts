/**
 * Profile Relationships API Proxy Routes
 *
 * Proxies relationship management requests to the backend.
 * Routes:
 *   GET  /api/profiles/[id]/relationships - List relationships for a profile
 *   POST /api/profiles/[id]/relationships - Add a relationship
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/profiles/[id]/relationships - List all relationships for a profile
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}/relationships`, {
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to fetch relationships' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching profile relationships:', error);
    return NextResponse.json({ message: 'An error occurred while fetching relationships' }, { status: 500 });
  }
}

// POST /api/profiles/[id]/relationships - Add a relationship
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}/relationships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to add relationship' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding profile relationship:', error);
    return NextResponse.json({ message: 'An error occurred while adding the relationship' }, { status: 500 });
  }
}
