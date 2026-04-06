/**
 * Canonical shape returned by GET /api/posts/public
 * (proxied through the Next.js route handler at /api/posts/public)
 */
export interface PublicPost {
  post_id: number;
  post_type_id: number;
  title: string;
  /** Full JSONB content blob — shape varies by post type */
  content: PostContent | null;
  created_at: string;
  type_name: string;
  username: string;
  primary_author_id: number | null;
  primary_author_name: string | null;
  like_count: number;
  liked_by_me: boolean | null;
}

/**
 * Relevant content fields we read across post types.
 * post_type_id 1 = writing  → body (string)
 * post_type_id 2 = art      → images[0].url (string), description
 * post_type_id 3 = media    → images[0].url (string), description
 * post_type_id 4 = event    → headerImage.url (string), description, eventDateTime
 */
export interface PostContent {
  body?: string;
  description?: string;
  images?: Array<{ url: string; caption?: string }>;
  headerImage?: { url: string };
  eventDateTime?: string;
  location?: string;
}

export interface PublicPostsResponse {
  posts: PublicPost[];
  total: number;
  hasMore: boolean;
}
