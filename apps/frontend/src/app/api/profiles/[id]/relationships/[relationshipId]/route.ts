/**
 * Profile Relationship Delete API Proxy Route
 *
 * Proxies relationship removal requests to the backend.
 * Route:
 *   DELETE /api/profiles/[id]/relationships/[relationshipId] - Remove a relationship
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// DELETE /api/profiles/[id]/relationships/[relationshipId] - Remove a relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; relationshipId: string }> },
) {
  try {
    const { id, relationshipId } = await params;
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles/${id}/relationships/${relationshipId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json') ? await response.json() : {};

    if (!response.ok) {
      return NextResponse.json({ message: data.error || 'Failed to remove relationship' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error removing profile relationship:', error);
    return NextResponse.json({ message: 'An error occurred while removing the relationship' }, { status: 500 });
  }
}
