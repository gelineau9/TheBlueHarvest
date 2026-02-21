import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express, { Express } from 'express';
import { createPool, DatabasePool } from 'slonik';
import { sql } from 'slonik';

// Test app setup
let app: Express;
let pool: DatabasePool;
let testAccountId: number;
let otherAccountId: number;
let validToken: string;
let otherToken: string;
let testCharacterId: number;
let testPostId: number;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

// Helper function to generate JWT token
const generateToken = (accountId: number, expiresIn: string = '1h'): string => {
  return jwt.sign({ userId: accountId }, JWT_SECRET, { expiresIn } as any);
};

beforeAll(async () => {
  // Setup test database connection
  const { DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const DB_HOST = 'localhost';
  const DB_PORT = '5433';

  pool = await createPool(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

  // Mock the database module
  vi.doMock('../src/config/database.js', () => ({
    default: Promise.resolve(pool),
    getPool: async () => pool,
  }));

  // Import routes after mocking
  const { default: commentsRoutes } = await import('../src/routes/comments.js');
  const { default: postsRoutes } = await import('../src/routes/posts.js');

  // Setup Express app
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/posts', postsRoutes);
  app.use('/api/posts', commentsRoutes);

  // Clean up any existing test data
  await pool.query(sql.unsafe`
    DELETE FROM comments WHERE account_id IN (
      SELECT account_id FROM accounts WHERE email IN ('commenttest@example.com', 'commenttest2@example.com')
    )
  `);
  await pool.query(sql.unsafe`
    DELETE FROM posts WHERE account_id IN (
      SELECT account_id FROM accounts WHERE email IN ('commenttest@example.com', 'commenttest2@example.com')
    )
  `);
  await pool.query(sql.unsafe`
    DELETE FROM profiles WHERE account_id IN (
      SELECT account_id FROM accounts WHERE email IN ('commenttest@example.com', 'commenttest2@example.com')
    )
  `);
  await pool.query(sql.unsafe`
    DELETE FROM accounts WHERE email IN ('commenttest@example.com', 'commenttest2@example.com')
  `);

  // Create test account
  const result = await pool.one(sql.unsafe`
    INSERT INTO accounts (username, email, hashed_password)
    VALUES ('commenttestuser', 'commenttest@example.com', '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword')
    RETURNING account_id
  `);
  testAccountId = result.account_id as number;
  validToken = generateToken(testAccountId);

  // Create second test account
  const result2 = await pool.one(sql.unsafe`
    INSERT INTO accounts (username, email, hashed_password)
    VALUES ('commenttestuser2', 'commenttest2@example.com', '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword')
    RETURNING account_id
  `);
  otherAccountId = result2.account_id as number;
  otherToken = generateToken(otherAccountId);

  // Create a test character for attribution
  const charResult = await pool.one(sql.unsafe`
    INSERT INTO profiles (account_id, profile_type_id, name)
    VALUES (${testAccountId}, 1, 'Test Comment Character')
    RETURNING profile_id
  `);
  testCharacterId = charResult.profile_id as number;

  // Create a test post for comments
  const postResult = await pool.one(sql.unsafe`
    INSERT INTO posts (account_id, post_type_id, title, content)
    VALUES (${testAccountId}, 1, 'Test Post for Comments', '{"body": "Test content"}')
    RETURNING post_id
  `);
  testPostId = postResult.post_id as number;
});

afterAll(async () => {
  // Clean up test data
  if (testAccountId) {
    await pool.query(sql.unsafe`DELETE FROM comments WHERE account_id IN (${testAccountId}, ${otherAccountId})`);
    await pool.query(sql.unsafe`DELETE FROM posts WHERE account_id IN (${testAccountId}, ${otherAccountId})`);
    await pool.query(sql.unsafe`DELETE FROM profiles WHERE account_id IN (${testAccountId}, ${otherAccountId})`);
    await pool.query(sql.unsafe`DELETE FROM accounts WHERE account_id IN (${testAccountId}, ${otherAccountId})`);
  }
  await pool.end();
  vi.restoreAllMocks();
});

describe('POST /api/posts/:postId/comments - Create Comment', () => {
  let testCommentId: number;

  afterEach(async () => {
    // Clean up comment created during test
    if (testCommentId) {
      await pool.query(sql.unsafe`DELETE FROM comments WHERE comment_id = ${testCommentId}`);
      testCommentId = 0;
    }
  });

  describe('Success Cases', () => {
    it('should create a comment on a post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'This is a test comment' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('comment_id');
      expect(response.body.content).toBe('This is a test comment');
      expect(response.body.post_id).toBe(testPostId);
      expect(response.body.account_id).toBe(testAccountId);
      expect(response.body.username).toBe('commenttestuser');
      expect(response.body.is_deleted).toBe(false);

      testCommentId = response.body.comment_id;
    });

    it('should create a comment with character attribution', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Comment from my character',
          profile_id: testCharacterId,
        });

      expect(response.status).toBe(201);
      expect(response.body.profile_id).toBe(testCharacterId);
      expect(response.body.profile_name).toBe('Test Comment Character');

      testCommentId = response.body.comment_id;
    });

    it('should allow different users to comment on the same post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Comment from another user' });

      expect(response.status).toBe(201);
      expect(response.body.account_id).toBe(otherAccountId);
      expect(response.body.username).toBe('commenttestuser2');

      testCommentId = response.body.comment_id;
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for empty content', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing content', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 for whitespace-only content', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .post('/api/posts/999999/comments')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Comment on non-existent post' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post not found');
    });

    it('should return 400 for invalid post ID', async () => {
      const response = await request(app)
        .post('/api/posts/invalid/comments')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Invalid post ID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid post ID');
    });
  });

  describe('Character Attribution Validation', () => {
    it('should return 400 when using a profile that does not belong to the user', async () => {
      // Create a character owned by the other user
      const otherCharResult = await pool.one(sql.unsafe`
        INSERT INTO profiles (account_id, profile_type_id, name)
        VALUES (${otherAccountId}, 1, 'Other User Character')
        RETURNING profile_id
      `);
      const otherCharId = otherCharResult.profile_id as number;

      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Trying to use someone elses character',
          profile_id: otherCharId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid profile: must be a character that you own');

      // Cleanup
      await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${otherCharId}`);
    });

    it('should return 400 when using a non-character profile type', async () => {
      // Create a non-character profile (e.g., location, profile_type_id = 5)
      const locationResult = await pool.one(sql.unsafe`
        INSERT INTO profiles (account_id, profile_type_id, name)
        VALUES (${testAccountId}, 5, 'Test Location')
        RETURNING profile_id
      `);
      const locationId = locationResult.profile_id as number;

      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Trying to use a location as author',
          profile_id: locationId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid profile: must be a character that you own');

      // Cleanup
      await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${locationId}`);
    });

    it('should return 400 for non-existent profile_id', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Using non-existent profile',
          profile_id: 999999,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid profile: must be a character that you own');
    });
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .send({ content: 'Unauthorized comment' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ content: 'Invalid token comment' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });
});

describe('GET /api/posts/:postId/comments - List Comments', () => {
  let comment1Id: number;
  let comment2Id: number;
  let deletedCommentId: number;

  beforeAll(async () => {
    // Create test comments
    const c1 = await pool.one(sql.unsafe`
      INSERT INTO comments (post_id, account_id, content)
      VALUES (${testPostId}, ${testAccountId}, 'First comment')
      RETURNING comment_id
    `);
    comment1Id = c1.comment_id as number;

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    const c2 = await pool.one(sql.unsafe`
      INSERT INTO comments (post_id, account_id, profile_id, content)
      VALUES (${testPostId}, ${testAccountId}, ${testCharacterId}, 'Comment with character')
      RETURNING comment_id
    `);
    comment2Id = c2.comment_id as number;

    // Create a deleted comment
    const c3 = await pool.one(sql.unsafe`
      INSERT INTO comments (post_id, account_id, content, is_deleted)
      VALUES (${testPostId}, ${testAccountId}, 'This was deleted', true)
      RETURNING comment_id
    `);
    deletedCommentId = c3.comment_id as number;
  });

  afterAll(async () => {
    await pool.query(sql.unsafe`
      DELETE FROM comments WHERE comment_id IN (${comment1Id}, ${comment2Id}, ${deletedCommentId})
    `);
  });

  describe('Success Cases', () => {
    it('should return all comments for a post ordered by created_at', async () => {
      const response = await request(app).get(`/api/posts/${testPostId}/comments`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      // Verify order (oldest first)
      const firstComment = response.body.find((c: any) => c.comment_id === comment1Id);
      const secondComment = response.body.find((c: any) => c.comment_id === comment2Id);
      expect(response.body.indexOf(firstComment)).toBeLessThan(response.body.indexOf(secondComment));
    });

    it('should include username in comment response', async () => {
      const response = await request(app).get(`/api/posts/${testPostId}/comments`);

      expect(response.status).toBe(200);
      const comment = response.body.find((c: any) => c.comment_id === comment1Id);
      expect(comment.username).toBe('commenttestuser');
    });

    it('should include profile_name when comment has character attribution', async () => {
      const response = await request(app).get(`/api/posts/${testPostId}/comments`);

      expect(response.status).toBe(200);
      const comment = response.body.find((c: any) => c.comment_id === comment2Id);
      expect(comment.profile_id).toBe(testCharacterId);
      expect(comment.profile_name).toBe('Test Comment Character');
    });

    it('should return null content for deleted comments', async () => {
      const response = await request(app).get(`/api/posts/${testPostId}/comments`);

      expect(response.status).toBe(200);
      const deletedComment = response.body.find((c: any) => c.comment_id === deletedCommentId);
      expect(deletedComment.is_deleted).toBe(true);
      expect(deletedComment.content).toBeNull();
    });

    it('should return empty array for post with no comments', async () => {
      // Create a post with no comments
      const emptyPostResult = await pool.one(sql.unsafe`
        INSERT INTO posts (account_id, post_type_id, title, content)
        VALUES (${testAccountId}, 1, 'Post with no comments', '{"body": "Empty"}')
        RETURNING post_id
      `);
      const emptyPostId = emptyPostResult.post_id as number;

      const response = await request(app).get(`/api/posts/${emptyPostId}/comments`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      // Cleanup
      await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id = ${emptyPostId}`);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent post', async () => {
      const response = await request(app).get('/api/posts/999999/comments');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post not found');
    });

    it('should return 400 for invalid post ID', async () => {
      const response = await request(app).get('/api/posts/invalid/comments');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid post ID');
    });

    it('should return 404 for deleted post', async () => {
      // Create and soft-delete a post
      const deletedPostResult = await pool.one(sql.unsafe`
        INSERT INTO posts (account_id, post_type_id, title, content, deleted)
        VALUES (${testAccountId}, 1, 'Deleted Post', '{}', true)
        RETURNING post_id
      `);
      const deletedPostId = deletedPostResult.post_id as number;

      const response = await request(app).get(`/api/posts/${deletedPostId}/comments`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post not found');

      // Cleanup
      await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id = ${deletedPostId}`);
    });
  });

  describe('Public Access', () => {
    it('should allow unauthenticated users to view comments', async () => {
      const response = await request(app).get(`/api/posts/${testPostId}/comments`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

describe('PUT /api/posts/:postId/comments/:commentId - Edit Comment', () => {
  let editableCommentId: number;

  beforeEach(async () => {
    // Create a comment to edit
    const result = await pool.one(sql.unsafe`
      INSERT INTO comments (post_id, account_id, content)
      VALUES (${testPostId}, ${testAccountId}, 'Original comment content')
      RETURNING comment_id
    `);
    editableCommentId = result.comment_id as number;
  });

  afterEach(async () => {
    if (editableCommentId) {
      await pool.query(sql.unsafe`DELETE FROM comments WHERE comment_id = ${editableCommentId}`);
    }
  });

  describe('Success Cases', () => {
    it('should allow user to edit their own comment', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Updated comment content' });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Updated comment content');
      expect(response.body.comment_id).toBe(editableCommentId);
    });

    it('should update the updated_at timestamp when editing', async () => {
      // Get original timestamps
      const original = await pool.one(sql.unsafe`
        SELECT created_at, updated_at FROM comments WHERE comment_id = ${editableCommentId}
      `);

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Edited content' });

      expect(response.status).toBe(200);
      expect(response.body.updated_at).not.toBe(response.body.created_at);
    });

    it('should return updated comment with user info', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Edited with user info' });

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('commenttestuser');
      expect(response.body.account_id).toBe(testAccountId);
    });
  });

  describe('Authorization', () => {
    it("should return 403 when trying to edit another user's comment", async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: "Trying to edit someone else's comment" });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You can only edit your own comments');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .send({ content: 'Unauthorized edit' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ content: 'Invalid token edit' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for empty content', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for whitespace-only content', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid post ID', async () => {
      const response = await request(app)
        .put(`/api/posts/invalid/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Invalid post ID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid post ID');
    });

    it('should return 400 for invalid comment ID', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/invalid`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Invalid comment ID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid comment ID');
    });
  });

  describe('Not Found Cases', () => {
    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/999999`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Non-existent comment' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found');
    });

    it('should return 404 when comment exists but on different post', async () => {
      // Create another post
      const otherPost = await pool.one(sql.unsafe`
        INSERT INTO posts (account_id, post_type_id, title, content)
        VALUES (${testAccountId}, 1, 'Other Post', '{}')
        RETURNING post_id
      `);

      const response = await request(app)
        .put(`/api/posts/${otherPost.post_id}/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Wrong post' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found');

      // Cleanup
      await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id = ${otherPost.post_id}`);
    });
  });

  describe('Deleted Comments', () => {
    it('should return 400 when trying to edit a deleted comment', async () => {
      // Soft delete the comment
      await pool.query(sql.unsafe`
        UPDATE comments SET is_deleted = true WHERE comment_id = ${editableCommentId}
      `);

      const response = await request(app)
        .put(`/api/posts/${testPostId}/comments/${editableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Trying to edit deleted comment' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot edit a deleted comment');
    });
  });
});

describe('DELETE /api/posts/:postId/comments/:commentId - Delete Comment', () => {
  let deletableCommentId: number;

  beforeEach(async () => {
    // Create a comment to delete
    const result = await pool.one(sql.unsafe`
      INSERT INTO comments (post_id, account_id, content)
      VALUES (${testPostId}, ${testAccountId}, 'Comment to be deleted')
      RETURNING comment_id
    `);
    deletableCommentId = result.comment_id as number;
  });

  afterEach(async () => {
    if (deletableCommentId) {
      await pool.query(sql.unsafe`DELETE FROM comments WHERE comment_id = ${deletableCommentId}`);
    }
  });

  describe('Success Cases', () => {
    it('should allow user to delete their own comment (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPostId}/comments/${deletableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Comment deleted');

      // Verify comment is soft-deleted
      const comment = await pool.one(sql.unsafe`
        SELECT is_deleted, content FROM comments WHERE comment_id = ${deletableCommentId}
      `);
      expect(comment.is_deleted).toBe(true);
      // Content should still exist in DB (soft delete)
      expect(comment.content).toBe('Comment to be deleted');
    });

    it('should return deleted comment in GET but with null content', async () => {
      // First delete the comment
      await request(app)
        .delete(`/api/posts/${testPostId}/comments/${deletableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Then fetch comments
      const response = await request(app).get(`/api/posts/${testPostId}/comments`);

      expect(response.status).toBe(200);
      const deletedComment = response.body.find((c: any) => c.comment_id === deletableCommentId);
      expect(deletedComment).toBeDefined();
      expect(deletedComment.is_deleted).toBe(true);
      expect(deletedComment.content).toBeNull();
    });
  });

  describe('Authorization', () => {
    it("should return 403 when trying to delete another user's comment", async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPostId}/comments/${deletableCommentId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You can only delete your own comments');

      // Verify comment was NOT deleted
      const comment = await pool.one(sql.unsafe`
        SELECT is_deleted FROM comments WHERE comment_id = ${deletableCommentId}
      `);
      expect(comment.is_deleted).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete(`/api/posts/${testPostId}/comments/${deletableCommentId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPostId}/comments/${deletableCommentId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid post ID', async () => {
      const response = await request(app)
        .delete(`/api/posts/invalid/comments/${deletableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid post ID');
    });

    it('should return 400 for invalid comment ID', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPostId}/comments/invalid`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid comment ID');
    });
  });

  describe('Not Found Cases', () => {
    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPostId}/comments/999999`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found');
    });

    it('should return 404 when comment exists but on different post', async () => {
      // Create another post
      const otherPost = await pool.one(sql.unsafe`
        INSERT INTO posts (account_id, post_type_id, title, content)
        VALUES (${testAccountId}, 1, 'Other Post for Delete', '{}')
        RETURNING post_id
      `);

      const response = await request(app)
        .delete(`/api/posts/${otherPost.post_id}/comments/${deletableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Comment not found');

      // Cleanup
      await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id = ${otherPost.post_id}`);
    });
  });

  describe('Already Deleted Comments', () => {
    it('should return 400 when trying to delete an already deleted comment', async () => {
      // First delete the comment
      await request(app)
        .delete(`/api/posts/${testPostId}/comments/${deletableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Try to delete again
      const response = await request(app)
        .delete(`/api/posts/${testPostId}/comments/${deletableCommentId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Comment is already deleted');
    });
  });
});
