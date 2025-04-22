import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth_token')

    if (!authToken) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 })
    }

    // TODO: Replace with actual API call to backend
    // For now, we'll use the sample user from the seed data
    return NextResponse.json({
      isLoggedIn: true,
      username: 'Legolas',
      avatarUrl: '',
    })
  } catch (err) {
    console.error('Auth check error:', err)
    return NextResponse.json({ isLoggedIn: false }, { status: 500 })
  }
}
