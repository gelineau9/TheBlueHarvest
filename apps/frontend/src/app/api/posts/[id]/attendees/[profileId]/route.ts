import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// DELETE /api/posts/:id/attendees/:profileId - Withdraw an RSVP
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; profileId: string }> }) {
  const authToken = request.cookies.get('auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, profileId } = await params;

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts/${id}/attendees/${profileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error withdrawing RSVP:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
