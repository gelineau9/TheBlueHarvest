/**
 * Kinship Member Delete API Proxy Route
 *
 * Proxies member removal requests to the backend.
 * Route:
 *   DELETE /api/profiles/[id]/members/[characterId] - Remove a character from a kinship
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// DELETE /api/profiles/[id]/members/[characterId] - Remove a character from a kinship
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> },
) {
  try {
    const { id, characterId } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}/members/${characterId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json') ? await response.json() : {};

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to remove member' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error removing kinship member:', error);
    return NextResponse.json({ message: 'An error occurred while removing the member' }, { status: 500 });
  }
}
