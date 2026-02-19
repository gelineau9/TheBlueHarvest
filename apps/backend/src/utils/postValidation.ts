/**
 * Post & Collection Validation Helpers
 *
 * Shared validation logic for posts and collections.
 * NOTE: Ownership and canEdit functions are in routes/editors.ts
 */

import { sql } from 'slonik';
import { z } from 'zod';

// Profile types that can author posts/collections
// Characters (1), Kinships (3), Organizations (4) can author
// Items (2) and Locations (5) CANNOT author (objects can't write)
export const AUTHOR_PROFILE_TYPES = [1, 3, 4];

/**
 * Verify a profile exists, is owned by the user, and can author content
 * Returns the profile if valid, null otherwise
 */
export async function getAuthorableProfile(
  db: any,
  profileId: number,
  userId: number
): Promise<{ profile_id: number; profile_type_id: number; name: string } | null> {
  const profile = await db.maybeOne(
    sql.type(
      z.object({
        profile_id: z.number(),
        profile_type_id: z.number(),
        name: z.string(),
      })
    )`
      SELECT profile_id, profile_type_id, name
      FROM profiles
      WHERE profile_id = ${profileId}
        AND account_id = ${userId}
        AND profile_type_id IN (${sql.join(AUTHOR_PROFILE_TYPES.map(id => sql.fragment`${id}`), sql.fragment`, `)})
        AND deleted = false
    `
  );
  return profile;
}

/**
 * Check if a post can be added to a collection based on type constraints
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export async function canAddPostToCollection(
  db: any,
  collectionId: number,
  postId: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Single query to get collection type info and post type together
  const result = await db.maybeOne(
    sql.type(
      z.object({
        allowed_post_types: z.array(z.number()).nullable(),
        collection_type_name: z.string(),
        post_type_id: z.number().nullable(),
        post_type_name: z.string().nullable(),
      })
    )`
      SELECT 
        ct.allowed_post_types,
        ct.type_name as collection_type_name,
        p.post_type_id,
        pt.type_name as post_type_name
      FROM collections c
      JOIN collection_types ct ON c.collection_type_id = ct.type_id
      LEFT JOIN posts p ON p.post_id = ${postId} AND p.deleted = false
      LEFT JOIN post_types pt ON p.post_type_id = pt.type_id
      WHERE c.collection_id = ${collectionId} AND c.deleted = false
    `
  );

  if (!result) {
    return { allowed: false, reason: 'Collection not found' };
  }

  if (result.post_type_id === null) {
    return { allowed: false, reason: 'Post not found' };
  }

  // If allowed_post_types is NULL, any post type is allowed
  if (result.allowed_post_types === null) {
    return { allowed: true };
  }

  // Check if post type is in the allowed list
  if (!result.allowed_post_types.includes(result.post_type_id)) {
    return {
      allowed: false,
      reason: `${result.collection_type_name} collections only accept specific post types. ${result.post_type_name} posts are not allowed.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if a post is already in a collection
 */
export async function isPostInCollection(db: any, collectionId: number, postId: number): Promise<boolean> {
  const result = await db.maybeOne(
    sql.type(z.object({ exists: z.boolean() }))`
      SELECT EXISTS (
        SELECT 1 FROM collection_posts
        WHERE collection_id = ${collectionId} AND post_id = ${postId} AND deleted = false
      ) as exists
    `
  );
  return result?.exists ?? false;
}

/**
 * Get the next sort_order for a collection
 */
export async function getNextSortOrder(db: any, collectionId: number): Promise<number> {
  const result = await db.maybeOne(
    sql.type(z.object({ max_order: z.number().nullable() }))`
      SELECT MAX(sort_order) as max_order
      FROM collection_posts
      WHERE collection_id = ${collectionId} AND deleted = false
    `
  );
  return (result?.max_order ?? -1) + 1;
}
