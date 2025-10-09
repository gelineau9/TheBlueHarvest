'use server'

import { cookies } from 'next/headers'
import { loginSchema } from './validations'
import { API_CONFIG } from '@/config/api'

export async function login(formData: FormData) {
  try {
    const email = formData.get('email')
    const password = formData.get('password')

    // Validate input
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      return {
        success: false,
        error: result.error.errors[0].message
      }
    }

    // Call backend API
    console.log('Calling backend at:', `${API_CONFIG.BACKEND_URL}/api/auth/login`)
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    console.log('Backend response status:', response.status)

    if (!response.ok) {
      const data = await response.json()
      console.log('Backend error:', data)
      return { success: false, error: data.message || 'Login failed' }
    }

    const data = await response.json()
    console.log('Backend success data:', data)

    const cookieStore = await cookies()
    await cookieStore.set({
      name: 'auth_token',
      value: data.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    console.log('Cookie set successfully')
    return { success: true }
  } catch (error) {
    console.error('Login action error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  await cookieStore.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 // Expire immediately
  })

  return { success: true }
}

export async function getSession() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth_token')

    console.log('Auth token exists:', !!authToken)

    if (!authToken) {
      return { isLoggedIn: false }
    }

    // Call backend API
    console.log('Calling backend at:', `${API_CONFIG.BACKEND_URL}/api/auth/me`)
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
      },
    })

    console.log('Backend /me response status:', response.status)

    if (!response.ok) {
      return { isLoggedIn: false }
    }

    const data = await response.json()
    console.log('Backend /me success data:', data)

    return {
      isLoggedIn: true,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
    }
  } catch (error) {
    console.error('Get session error:', error)
    return { isLoggedIn: false }
  }
}
