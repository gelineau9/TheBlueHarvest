import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const accountUpdateSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
});

export const createProfileSchema = z.object({
  profile_type_id: z.number().int().min(1).max(5),
  name: z.string().min(1, 'Profile name is required').max(100, 'Profile name must not exceed 100 characters'),
  details: z.string().optional(),
  parent_profile_id: z.number().int().optional(),
});

// Post types: 1=writing, 2=art, 3=media, 4=event
export const createPostSchema = z.object({
  post_type_id: z.number().int().min(1).max(4),
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  content: z.object({
    body: z.string().min(1, 'Content is required'),
    tags: z.array(z.string()).optional(),
  }),
  primary_author_profile_id: z.number().int({ message: 'Please select an author' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
