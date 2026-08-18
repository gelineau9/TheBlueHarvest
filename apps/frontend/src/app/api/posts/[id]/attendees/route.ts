import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// GET /api/posts/:id/attendees - Count (public) + guest list (organiser only)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authToken = request.cookies.get('auth_token')?.value;
  const { id } = await params;

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/attendees`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/posts/:id/attendees - RSVP as one of your characters
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authToken = request.cookies.get('auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const body = await request.json();
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/attendees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error recording RSVP:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
