'use server';

import { cookies } from 'next/headers';
import {
  loginSchema,
  registerSchema,
  accountUpdateSchema,
  createProfileSchema,
  CreateProfileInput,
  createPostSchema,
  CreatePostInput,
  createCollectionSchema,
  CreateCollectionInput,
} from './validations';
import { API_CONFIG } from '@/config/api';

export async function login(formData: FormData) {
  try {
    const email = formData.get('email');
    const password = formData.get('password');

    // Validate input
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      return {
        success: false,
        // error: result.error.errors[0].message,
        // Zod breaking change from upgrade, issue #12
        error: result.error.issues[0]?.message ?? 'Validation failed',
      };
    }

    // Call backend API
    console.log('Calling backend at:', `${API_CONFIG.BACKEND_URL}/api/auth/login`);
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const data = await response.json();
      console.log('Backend error:', data);
      return { success: false, error: data.message || 'Login failed' };
    }

    const data = await response.json();
    console.log('Backend success data:', data);

    const cookieStore = await cookies();
    await cookieStore.set({
      name: 'auth_token',
      value: data.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    console.log('Cookie set successfully');
    return { success: true };
  } catch (error) {
    console.error('Login action error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  await cookieStore.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
  });

  return { success: true };
}

export async function register(formData: FormData) {
  try {
    const email = formData.get('email');
    const username = formData.get('username');
    const password = formData.get('password');

    // Validate input
    const result = registerSchema.safeParse({
      email,
      username,
      password,
      confirmPassword: password, // For validation, we'll use the same password
    });

    if (!result.success) {
      return {
        success: false,
        // error: result.error.errors[0].message,
        // Zod breaking change from upgrade, issue #12
        error: result.error.issues[0]?.message ?? 'Validation failed',
      };
    }

    // Call backend API
    console.log('Calling backend at:', `${API_CONFIG.BACKEND_URL}/api/auth/signup`);
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        username,
        password,
      }),
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const data = await response.json();
      console.log('Backend error:', data);
      return { success: false, error: data.message || 'Registration failed' };
    }

    const data = await response.json();
    console.log('Backend success data:', data);

    const cookieStore = await cookies();
    await cookieStore.set({
      name: 'auth_token',
      value: data.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    console.log('Cookie set successfully');
    return { success: true };
  } catch (error) {
    console.error('Registration action error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateAccount(formData: FormData) {
  try {
    const username = formData.get('username');

    // Validate input
    const result = accountUpdateSchema.safeParse({
      username: username || undefined,
    });

    if (!result.success) {
      return {
        success: false,
        // error: result.error.errors[0].message,
        // Zod breaking change from upgrade, issue #12
        error: result.error.issues[0]?.message ?? 'Validation failed',
      };
    }

    // Get auth token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return { success: false, error: 'Not authenticated' };
    }

    // Call backend API
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`,
      },
      body: JSON.stringify({
        username: result.data.username,
      }),
    });

    if (!response.ok) {
      // If unauthorized (401), token is invalid/expired - clean up the cookie
      if (response.status === 401) {
        console.log('Token invalid/expired during account update, clearing cookie');
        await cookieStore.set('auth_token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 0,
        });
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      const data = await response.json();
      return { success: false, error: data.message || 'Account update failed' };
    }

    const data = await response.json();
    return { success: true, user: data };
  } catch (error) {
    console.error('Account update error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function createProfile(formData: CreateProfileInput) {
  try {
    // Validate input
    const result = createProfileSchema.safeParse(formData);

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues[0]?.message || 'Invalid input',
      };
    }
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');
    if (!authToken) {
      return { success: false, error: 'Not authenticated. Please log in.' };
    }
    // Call backend API
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`,
      },
      body: JSON.stringify({
        profile_type_id: result.data.profile_type_id,
        name: result.data.name.trim(),
        details: result.data.details ? JSON.parse(result.data.details) : null,
        parent_profile_id: result.data.parent_profile_id,
        is_published: result.data.is_published,
      }),
    });
    if (!response.ok) {
      // If unauthorized (401), token is invalid/expired - clean up the cookie
      if (response.status === 401) {
        console.log('Token invalid/expired during profile creation, clearing cookie');
        await cookieStore.set('auth_token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 0,
        });
        return { success: false, error: 'Session expired. Please log in again.' };
      }
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to create profile',
      };
    }
    const data = await response.json();
    return {
      success: true,
      profile: data,
    };
  } catch (error) {
    console.error('Profile creation error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    console.log('Auth token exists:', !!authToken);

    if (!authToken) {
      return { isLoggedIn: false };
    }

    // Call backend API
    console.log('Calling backend at:', `${API_CONFIG.BACKEND_URL}/api/auth/me`);
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken.value}`,
      },
    });

    console.log('Backend /me response status:', response.status);

    if (!response.ok) {
      // Token is invalid or expired - clean up the cookie
      console.log('Token invalid/expired, clearing cookie');
      await cookieStore.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0, // Expire immediately
      });
      return { isLoggedIn: false };
    }

    const data = await response.json();

    return {
      isLoggedIn: true,
      id: data.id,
      username: data.username,
      email: data.email,
    };
  } catch (error) {
    console.error('Get session error:', error);
    return { isLoggedIn: false };
  }
}

export async function createPost(formData: CreatePostInput) {
  try {
    // Validate input
    const result = createPostSchema.safeParse(formData);

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues[0]?.message || 'Invalid input',
      };
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return { success: false, error: 'Not authenticated. Please log in.' };
    }

    // Call backend API
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`,
      },
      body: JSON.stringify({
        post_type_id: result.data.post_type_id,
        title: result.data.title.trim(),
        content: result.data.content,
        primary_author_profile_id: result.data.primary_author_profile_id,
        is_published: result.data.is_published,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await cookieStore.set('auth_token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 0,
        });
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to create post',
      };
    }

    const data = await response.json();
    return {
      success: true,
      post: data,
    };
  } catch (error) {
    console.error('Post creation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}

export async function createCollection(formData: CreateCollectionInput) {
  try {
    // Validate input
    const result = createCollectionSchema.safeParse(formData);

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues[0]?.message || 'Invalid input',
      };
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return { success: false, error: 'Not authenticated. Please log in.' };
    }

    // Call backend API
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`,
      },
      body: JSON.stringify({
        collection_type_id: result.data.collection_type_id,
        title: result.data.title.trim(),
        description: result.data.description?.trim() || '',
        content: result.data.content || {},
        primary_author_profile_id: result.data.primary_author_profile_id,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await cookieStore.set('auth_token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 0,
        });
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to create collection',
      };
    }

    const data = await response.json();
    return {
      success: true,
      collection: data,
    };
  } catch (error) {
    console.error('Collection creation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}

// Update collection action
export async function updateCollection(
  collectionId: number,
  formData: {
    title: string;
    description?: string;
    content?: Record<string, unknown>;
    primary_author_profile_id?: number;
  },
): Promise<{ success: boolean; error?: string; collection?: { collection_id: number } }> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return { success: false, error: 'Not authenticated. Please log in.' };
    }

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/collections/${collectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`,
      },
      body: JSON.stringify({
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        content: formData.content || {},
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await cookieStore.set('auth_token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 0,
        });
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      if (response.status === 403) {
        return { success: false, error: 'You do not have permission to edit this collection.' };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to update collection',
      };
    }

    const data = await response.json();
    return {
      success: true,
      collection: data,
    };
  } catch (error) {
    console.error('Collection update error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}
