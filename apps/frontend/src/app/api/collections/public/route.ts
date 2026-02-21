import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Forward all query params to the backend
    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_CONFIG.BACKEND_URL}/api/collections/public?${queryString}`
      : `${API_CONFIG.BACKEND_URL}/api/collections/public`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch collections' }));
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch collections' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Public collections fetch error:', error);
    return NextResponse.json({ message: 'An error occurred while fetching collections' }, { status: 500 });
  }
}
