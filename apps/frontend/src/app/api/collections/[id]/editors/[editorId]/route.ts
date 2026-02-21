import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

// DELETE /api/collections/:id/editors/:editorId - Remove an editor from a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; editorId: string }> }
) {
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, editorId } = await params;

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/collections/${id}/editors/${editorId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error removing editor from collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
