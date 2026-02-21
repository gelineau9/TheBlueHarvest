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
let validToken: string;
let testCharacterId: number;

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
  const { default: authRoutes } = await import('../src/routes/auth.js');
  const { default: postsRoutes } = await import('../src/routes/posts.js');
  const { default: profilesRoutes } = await import('../src/routes/profiles.js');
  const { postEditorRoutes, postAuthorRoutes } = await import('../src/routes/editors.js');

  // Setup Express app
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postsRoutes);
  app.use('/api/posts', postEditorRoutes);
  app.use('/api/posts', postAuthorRoutes);
  app.use('/api/profiles', profilesRoutes);

  // Clean up any existing test data
  await pool.query(sql.unsafe`
    DELETE FROM authors WHERE post_id IN (
      SELECT post_id FROM posts WHERE account_id IN (
        SELECT account_id FROM accounts WHERE email = 'posttest@example.com'
      )
    )
  `);
  await pool.query(sql.unsafe`
    DELETE FROM posts WHERE account_id IN (
      SELECT account_id FROM accounts WHERE email = 'posttest@example.com'
    )
  `);
  await pool.query(sql.unsafe`
    DELETE FROM profiles WHERE account_id IN (
      SELECT account_id FROM accounts WHERE email = 'posttest@example.com'
    )
  `);
  await pool.query(sql.unsafe`
    DELETE FROM accounts WHERE email = 'posttest@example.com'
  `);

  // Create test account
  const result = await pool.one(sql.unsafe`
    INSERT INTO accounts (username, email, hashed_password)
    VALUES ('posttestuser', 'posttest@example.com', '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword')
    RETURNING account_id
  `);
  testAccountId = result.account_id as number;

  // Generate valid token
  validToken = generateToken(testAccountId);

  // Create a test character for writing posts
  const charResult = await pool.one(sql.unsafe`
    INSERT INTO profiles (account_id, profile_type_id, name)
    VALUES (${testAccountId}, 1, 'Test Author Character')
    RETURNING profile_id
  `);
  testCharacterId = charResult.profile_id as number;
});

afterAll(async () => {
  // Clean up test data
  if (testAccountId) {
    await pool.query(sql.unsafe`
      DELETE FROM authors WHERE post_id IN (
        SELECT post_id FROM posts WHERE account_id = ${testAccountId}
      )
    `);
    await pool.query(sql.unsafe`DELETE FROM posts WHERE account_id = ${testAccountId}`);
    await pool.query(sql.unsafe`DELETE FROM profiles WHERE account_id = ${testAccountId}`);
    await pool.query(sql.unsafe`DELETE FROM accounts WHERE account_id = ${testAccountId}`);
  }
  await pool.end();
  vi.restoreAllMocks();
});

describe('POST /api/posts - Create Post', () => {
  let testPostId: number;

  afterEach(async () => {
    // Clean up post created during test
    if (testPostId) {
      await pool.query(sql.unsafe`DELETE FROM authors WHERE post_id = ${testPostId}`);
      await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id = ${testPostId}`);
      testPostId = 0;
    }
  });

  describe('Writing Posts (post_type_id = 1)', () => {
    it('should create a writing post with author', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          post_type_id: 1,
          title: 'The Road to Bree',
          content: { body: 'The wind howled across the land...', tags: ['adventure', 'travel'] },
          primary_author_profile_id: testCharacterId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('post_id');
      expect(response.body.title).toBe('The Road to Bree');
      expect(response.body.post_type_id).toBe(1);
      expect(response.body.primary_author).toBeDefined();
      expect(response.body.primary_author.profile_id).toBe(testCharacterId);

      testPostId = response.body.post_id;
    });

    it('should return 400 when author profile does not exist', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          post_type_id: 1,
          title: 'Invalid Author Post',
          content: { body: 'Some content' },
          primary_author_profile_id: 999999,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Primary author must be a character, kinship, or organization that you own');
    });
  });

  describe('Art Posts (post_type_id = 2)', () => {
    it('should create an art post without author (account-level)', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          post_type_id: 2,
          title: 'My LOTRO Artwork',
          content: {
            images: [{ filename: 'test.jpg', url: '/uploads/images/test.jpg', originalName: 'test.jpg' }],
            description: 'A beautiful scene from Middle-earth',
            tags: ['art', 'landscape'],
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('post_id');
      expect(response.body.title).toBe('My LOTRO Artwork');
      expect(response.body.post_type_id).toBe(2);
      expect(response.body.primary_author).toBeUndefined();

      testPostId = response.body.post_id;
    });

    it('should allow art post with empty images array', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          post_type_id: 2,
          title: 'Art Post No Images',
          content: {
            images: [],
            description: 'Work in progress',
          },
        });

      expect(response.status).toBe(201);
      testPostId = response.body.post_id;
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing title', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          post_type_id: 2,
          content: { images: [] },
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for title exceeding 200 characters', async () => {
      const longTitle = 'A'.repeat(201);
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          post_type_id: 2,
          title: longTitle,
          content: { images: [] },
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid post_type_id', async () => {
      const response = await request(app).post('/api/posts').set('Authorization', `Bearer ${validToken}`).send({
        post_type_id: 99,
        title: 'Invalid Type',
        content: {},
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing post_type_id', async () => {
      const response = await request(app).post('/api/posts').set('Authorization', `Bearer ${validToken}`).send({
        title: 'No Type',
        content: {},
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/posts').send({
        post_type_id: 2,
        title: 'Unauthorized Post',
        content: {},
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app).post('/api/posts').set('Authorization', 'Bearer invalid-token').send({
        post_type_id: 2,
        title: 'Invalid Token Post',
        content: {},
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });
});

describe('GET /api/posts/:id - Fetch Single Post', () => {
  let writingPostId: number;
  let artPostId: number;

  beforeAll(async () => {
    // Create a writing post with author
    const writingResult = await pool.one(sql.unsafe`
      INSERT INTO posts (account_id, post_type_id, title, content)
      VALUES (${testAccountId}, 1, 'Test Writing Post', '{"body": "Test content", "tags": ["test"]}')
      RETURNING post_id
    `);
    writingPostId = writingResult.post_id as number;

    // Add author to writing post
    await pool.query(sql.unsafe`
      INSERT INTO authors (post_id, profile_id, is_primary)
      VALUES (${writingPostId}, ${testCharacterId}, true)
    `);

    // Create an art post (no author)
    const artResult = await pool.one(sql.unsafe`
      INSERT INTO posts (account_id, post_type_id, title, content)
      VALUES (${testAccountId}, 2, 'Test Art Post', '{"images": [], "description": "Test art"}')
      RETURNING post_id
    `);
    artPostId = artResult.post_id as number;
  });

  afterAll(async () => {
    await pool.query(sql.unsafe`DELETE FROM authors WHERE post_id IN (${writingPostId}, ${artPostId})`);
    await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id IN (${writingPostId}, ${artPostId})`);
  });

  describe('Success Cases', () => {
    it('should fetch writing post with author info', async () => {
      const response = await request(app).get(`/api/posts/${writingPostId}`);

      expect(response.status).toBe(200);
      expect(response.body.post_id).toBe(writingPostId);
      expect(response.body.title).toBe('Test Writing Post');
      expect(response.body.post_type_id).toBe(1);
      expect(response.body.type_name).toBe('writing');
      expect(response.body.authors).toBeDefined();
      expect(response.body.authors.length).toBe(1);
      expect(response.body.authors[0].profile_name).toBe('Test Author Character');
      expect(response.body.authors[0].is_primary).toBe(true);
    });

    it('should fetch art post without authors', async () => {
      const response = await request(app).get(`/api/posts/${artPostId}`);

      expect(response.status).toBe(200);
      expect(response.body.post_id).toBe(artPostId);
      expect(response.body.title).toBe('Test Art Post');
      expect(response.body.post_type_id).toBe(2);
      expect(response.body.type_name).toBe('art');
      expect(response.body.authors).toEqual([]);
    });

    it('should include username from accounts', async () => {
      const response = await request(app).get(`/api/posts/${writingPostId}`);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('posttestuser');
    });

    it('should show can_edit=true for post owner', async () => {
      const response = await request(app)
        .get(`/api/posts/${writingPostId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(true);
      expect(response.body.is_owner).toBe(true);
    });

    it('should show can_edit=false for non-owner', async () => {
      const otherToken = generateToken(testAccountId + 1000);
      const response = await request(app)
        .get(`/api/posts/${writingPostId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(false);
    });

    it('should show can_edit=false for unauthenticated users', async () => {
      const response = await request(app).get(`/api/posts/${writingPostId}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(false);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent post', async () => {
      const response = await request(app).get('/api/posts/999999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post not found');
    });

    it('should return 400 for invalid post ID', async () => {
      const response = await request(app).get('/api/posts/not-a-number');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid post ID');
    });

    it('should return 404 for soft-deleted post', async () => {
      // Create and soft-delete a post
      const result = await pool.one(sql.unsafe`
        INSERT INTO posts (account_id, post_type_id, title, content, deleted)
        VALUES (${testAccountId}, 2, 'Deleted Post', '{}', true)
        RETURNING post_id
      `);
      const deletedPostId = result.post_id as number;

      const response = await request(app).get(`/api/posts/${deletedPostId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post not found');

      // Clean up
      await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id = ${deletedPostId}`);
    });
  });
});

describe('PUT /api/posts/:id - Update Post', () => {
  let editablePostId: number;

  beforeEach(async () => {
    // Create a fresh post for each test
    const result = await pool.one(sql.unsafe`
      INSERT INTO posts (account_id, post_type_id, title, content)
      VALUES (${testAccountId}, 2, 'Editable Post', '{"description": "Original"}')
      RETURNING post_id
    `);
    editablePostId = result.post_id as number;
  });

  afterEach(async () => {
    if (editablePostId) {
      await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id = ${editablePostId}`);
    }
  });

  describe('Successful Updates', () => {
    it('should update post title', async () => {
      const response = await request(app)
        .put(`/api/posts/${editablePostId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
    });

    it('should update post content', async () => {
      const response = await request(app)
        .put(`/api/posts/${editablePostId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: { description: 'Updated description' } });

      expect(response.status).toBe(200);
      expect(response.body.content.description).toBe('Updated description');
    });

    it('should update both title and content', async () => {
      const response = await request(app)
        .put(`/api/posts/${editablePostId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'New Title',
          content: { description: 'New description' },
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('New Title');
      expect(response.body.content.description).toBe('New description');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).put(`/api/posts/${editablePostId}`).send({ title: 'Unauthorized' });

      expect(response.status).toBe(401);
    });

    it('should return 403 when updating post owned by another user', async () => {
      const otherToken = generateToken(testAccountId + 1000);

      const response = await request(app)
        .put(`/api/posts/${editablePostId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Not My Post' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have permission to edit this post');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for title exceeding 200 characters', async () => {
      const longTitle = 'A'.repeat(201);

      const response = await request(app)
        .put(`/api/posts/${editablePostId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: longTitle });

      expect(response.status).toBe(400);
    });

    it('should return 400 when no fields provided', async () => {
      const response = await request(app)
        .put(`/api/posts/${editablePostId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .put('/api/posts/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'Non-existent' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid post ID', async () => {
      const response = await request(app)
        .put('/api/posts/invalid')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'Invalid ID' });

      expect(response.status).toBe(400);
    });
  });
});

describe('DELETE /api/posts/:id - Delete Post', () => {
  let deletablePostId: number;

  beforeEach(async () => {
    const result = await pool.one(sql.unsafe`
      INSERT INTO posts (account_id, post_type_id, title, content)
      VALUES (${testAccountId}, 2, 'Deletable Post', '{}')
      RETURNING post_id
    `);
    deletablePostId = result.post_id as number;
  });

  afterEach(async () => {
    if (deletablePostId) {
      await pool.query(sql.unsafe`DELETE FROM posts WHERE post_id = ${deletablePostId}`);
    }
  });

  describe('Successful Deletion', () => {
    it('should soft-delete a post owned by the user', async () => {
      const response = await request(app)
        .delete(`/api/posts/${deletablePostId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post deleted successfully');

      // Verify soft-deleted in database
      const dbPost = await pool.maybeOne(sql.unsafe`
        SELECT deleted FROM posts WHERE post_id = ${deletablePostId}
      `);
      expect(dbPost?.deleted).toBe(true);
    });

    it('should make post inaccessible via GET after deletion', async () => {
      await request(app).delete(`/api/posts/${deletablePostId}`).set('Authorization', `Bearer ${validToken}`);

      const getResponse = await request(app).get(`/api/posts/${deletablePostId}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete(`/api/posts/${deletablePostId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when deleting post owned by another user', async () => {
      const otherToken = generateToken(testAccountId + 1000);

      const response = await request(app)
        .delete(`/api/posts/${deletablePostId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Post not found or not authorized');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent post', async () => {
      const response = await request(app).delete('/api/posts/999999').set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when trying to delete already-deleted post', async () => {
      // First deletion
      await request(app).delete(`/api/posts/${deletablePostId}`).set('Authorization', `Bearer ${validToken}`);

      // Second deletion should fail
      const response = await request(app)
        .delete(`/api/posts/${deletablePostId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });
});
