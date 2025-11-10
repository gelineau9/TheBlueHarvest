import { register } from '@/app/lib/actions'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('username', data.username)
    formData.append('password', data.password)
    formData.append('first_name', data.first_name)
    formData.append('last_name', data.last_name)

    const result = await register(formData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
