'use server'

import { cookies } from 'next/headers'
import { loginSchema } from './validations'

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

    // TODO: Replace with actual API call to backend
    // For now, we'll use the test user
    if (email === 'test@test.com' && password === 'admin12345') {
      const cookieStore = await cookies()
      await cookieStore.set({
        name: 'auth_token',
        value: 'sample-token',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })

      return { success: true }
    }

    return { success: false, error: 'Invalid email or password' }
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
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')

  if (!authToken) {
    return { isLoggedIn: false }
  }

  // TODO: Replace with actual API call to backend
  // For now, we'll use the sample user from the seed data
  return {
    isLoggedIn: true,
    username: 'Legolas',
    avatarUrl: '',
  }
}
