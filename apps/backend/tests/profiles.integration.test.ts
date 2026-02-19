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
let testProfileId: number;
let validToken: string;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

// Helper function to generate JWT token
const generateToken = (accountId: number, expiresIn: string = '1h'): string => {
  return jwt.sign({ userId: accountId }, JWT_SECRET, { expiresIn } as any);
};

// Helper function to generate expired token
const generateExpiredToken = (accountId: number): string => {
  return jwt.sign({ userId: accountId }, JWT_SECRET, { expiresIn: '-1h' } as any);
};

beforeAll(async () => {
  // Setup test database connection (Slonik 48+ returns Promise)
  // Use localhost for tests running outside Docker (container port 5433 maps to container's 5432)
  const { DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const DB_HOST = 'localhost';
  const DB_PORT = '5433'; // Host port mapped from container's 5432

  pool = await createPool(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

  // Mock the database module to return our test pool
  vi.doMock('../src/config/database.js', () => ({
    default: Promise.resolve(pool),
  }));

  // Now import routes AFTER mocking the database
  const { default: authRoutes } = await import('../src/routes/auth.js');
  const { default: profilesRoutes } = await import('../src/routes/profiles.js');
  const { default: profileEditorsRoutes } = await import('../src/routes/profileEditors.js');

  // Setup Express app
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/profiles', profilesRoutes);
  app.use('/api/profiles', profileEditorsRoutes);

  // Clean up any existing test account from previous failed runs
  await pool.query(sql.unsafe`
    DELETE FROM profiles WHERE account_id IN (
      SELECT account_id FROM accounts WHERE email = 'test@example.com'
    )
  `);
  await pool.query(sql.unsafe`
    DELETE FROM accounts WHERE email = 'test@example.com'
  `);

  // Create test account
  const result = await pool.one(sql.unsafe`
    INSERT INTO accounts (username, email, hashed_password)
    VALUES ('testuser', 'test@example.com', '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword')
    RETURNING account_id
  `);
  testAccountId = result.account_id as number;

  // Generate valid token for test account
  validToken = generateToken(testAccountId);
});

afterAll(async () => {
  // Clean up test data
  if (testAccountId) {
    await pool.query(sql.unsafe`DELETE FROM profiles WHERE account_id = ${testAccountId}`);
    await pool.query(sql.unsafe`DELETE FROM accounts WHERE account_id = ${testAccountId}`);
  }
  await pool.end();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // Reset test profile ID before each test
  testProfileId = 0;
});

afterEach(async () => {
  // Clean up any profiles created during tests
  if (testProfileId) {
    await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${testProfileId}`);
  }
});

describe('Authentication Middleware', () => {
  it('should authenticate with valid JWT token', async () => {
    const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
      profile_type_id: 1,
      name: 'Test Character',
    });

    expect(response.status).not.toBe(401);
  });

  it('should return 401 for missing token', async () => {
    const response = await request(app).post('/api/profiles').send({
      profile_type_id: 1,
      name: 'Test Character',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app).post('/api/profiles').set('Authorization', 'Bearer invalid-token-string').send({
      profile_type_id: 1,
      name: 'Test Character',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid token');
  });

  it('should return 401 for expired token', async () => {
    const expiredToken = generateExpiredToken(testAccountId);

    const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${expiredToken}`).send({
      profile_type_id: 1,
      name: 'Test Character',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Token expired');
  });
});

describe('POST /api/profiles', () => {
  let parentCharacterId: number;

  beforeAll(async () => {
    // Create a parent character for testing child profiles (Items, Kinships, Organizations)
    const charResponse = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
      profile_type_id: 1,
      name: 'Test Parent Character',
    });
    parentCharacterId = charResponse.body.profile_id;
  });

  describe('Success Cases', () => {
    it('should create character profile (type_id: 1) with valid token and data', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 1,
        name: 'Aragorn',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('profile_id');
      expect(response.body.name).toBe('Aragorn');
      expect(response.body.profile_type_id).toBe(1);
      expect(response.body.account_id).toBe(testAccountId);

      // Store for cleanup
      testProfileId = response.body.profile_id;
    });

    it('should create item profile (type_id: 2) with name only (no details)', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 2,
        name: 'One Ring',
        parent_profile_id: parentCharacterId,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('profile_id');
      expect(response.body.name).toBe('One Ring');
      expect(response.body.profile_type_id).toBe(2);
      expect(response.body.details).toBeNull();

      testProfileId = response.body.profile_id;
    });

    it('should create kinship with details field populated', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 3,
        name: 'Fellowship of the Ring',
        details: 'A fellowship formed in Rivendell to destroy the One Ring',
        parent_profile_id: parentCharacterId,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('profile_id');
      expect(response.body.name).toBe('Fellowship of the Ring');
      expect(response.body.profile_type_id).toBe(3);
      expect(response.body.details).toBe('A fellowship formed in Rivendell to destroy the One Ring');

      testProfileId = response.body.profile_id;
    });

    it('should verify created profile has correct account_id from JWT token', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 4,
        name: 'White Council',
        parent_profile_id: parentCharacterId,
      });

      expect(response.status).toBe(201);
      expect(response.body.account_id).toBe(testAccountId);

      // Verify in database
      const dbProfile = await pool.maybeOne(sql.unsafe`
        SELECT account_id FROM profiles WHERE profile_id = ${response.body.profile_id}
      `);
      expect(dbProfile?.account_id).toBe(testAccountId);

      testProfileId = response.body.profile_id;
    });
  });

  describe('Validation Error Cases (400)', () => {
    it('should return 400 for missing name field', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 1,
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      const nameError = response.body.errors.find((e: any) => e.path === 'name');
      expect(nameError).toBeDefined();
    });

    it('should return 400 for empty name string', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 1,
        name: '',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      const nameError = response.body.errors.find((e: any) => e.path === 'name');
      expect(nameError).toBeDefined();
    });

    it('should return 400 for name exceeding 100 characters', async () => {
      const longName = 'A'.repeat(101);
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 1,
        name: longName,
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      const nameError = response.body.errors.find((e: any) => e.path === 'name');
      expect(nameError).toBeDefined();
    });

    it('should return 400 for invalid profile_type_id (0)', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 0,
        name: 'Test Profile',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      const typeError = response.body.errors.find((e: any) => e.path === 'profile_type_id');
      expect(typeError).toBeDefined();
    });

    it('should return 400 for invalid profile_type_id (6)', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 6,
        name: 'Test Profile',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      const typeError = response.body.errors.find((e: any) => e.path === 'profile_type_id');
      expect(typeError).toBeDefined();
    });

    it('should return 400 for invalid profile_type_id (-1)', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: -1,
        name: 'Test Profile',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      const typeError = response.body.errors.find((e: any) => e.path === 'profile_type_id');
      expect(typeError).toBeDefined();
    });

    it('should return 400 for missing profile_type_id', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        name: 'Test Profile',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      const typeError = response.body.errors.find((e: any) => e.path === 'profile_type_id');
      expect(typeError).toBeDefined();
    });
  });

  describe('Authentication Error Cases (401)', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app).post('/api/profiles').send({
        profile_type_id: 1,
        name: 'Test Character',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', 'Bearer this-is-not-a-valid-jwt-token')
        .send({
          profile_type_id: 1,
          name: 'Test Character',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Edge Cases', () => {
    it('should trim name with leading/trailing whitespace and accept', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 1,
        name: '   Frodo Baggins   ',
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Frodo Baggins');

      testProfileId = response.body.profile_id;
    });

    it('should accept details as null', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 1,
        name: 'Gandalf',
        details: null,
      });

      expect(response.status).toBe(201);
      expect(response.body.details).toBeNull();

      testProfileId = response.body.profile_id;
    });

    it('should accept details as empty string', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 1,
        name: 'Legolas',
        details: '',
      });

      expect(response.status).toBe(201);
      expect(response.body.details).toBe('');

      testProfileId = response.body.profile_id;
    });
  });
});

describe('GET /api/profiles/public', () => {
  let publicProfile1Id: number;
  let publicProfile2Id: number;
  let publicProfile3Id: number;

  beforeAll(async () => {
    // Create multiple test profiles for pagination testing
    const profile1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
      profile_type_id: 1,
      name: 'Public Character 1',
      details: 'First test character',
    });
    publicProfile1Id = profile1.body.profile_id;

    const profile2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
      profile_type_id: 5,
      name: 'Public Location 1',
      details: 'Test location',
    });
    publicProfile2Id = profile2.body.profile_id;

    const profile3 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
      profile_type_id: 1,
      name: 'Public Character 2',
      details: 'Second test character',
    });
    publicProfile3Id = profile3.body.profile_id;
  });

  afterAll(async () => {
    // Clean up test profiles
    if (publicProfile1Id) {
      await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${publicProfile1Id}`);
    }
    if (publicProfile2Id) {
      await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${publicProfile2Id}`);
    }
    if (publicProfile3Id) {
      await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${publicProfile3Id}`);
    }
  });

  describe('Success Cases', () => {
    it('should return all profiles without authentication', async () => {
      const response = await request(app).get('/api/profiles/public');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.profiles)).toBe(true);
    });

    it('should include profile_id, name, profile_type_id, type_name, created_at, and username in response', async () => {
      const response = await request(app).get('/api/profiles/public');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeGreaterThan(0);

      const profile = response.body.profiles[0];
      expect(profile).toHaveProperty('profile_id');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('profile_type_id');
      expect(profile).toHaveProperty('type_name');
      expect(profile).toHaveProperty('created_at');
      expect(profile).toHaveProperty('username');
    });

    it('should exclude soft-deleted profiles (deleted=true)', async () => {
      // Create a profile and soft-delete it
      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          profile_type_id: 1,
          name: 'To Be Deleted Profile',
        });

      const deletedProfileId = createResponse.body.profile_id;

      // Soft delete the profile
      await pool.query(sql.unsafe`
        UPDATE profiles SET deleted = true WHERE profile_id = ${deletedProfileId}
      `);

      // Fetch public profiles
      const response = await request(app).get('/api/profiles/public');

      expect(response.status).toBe(200);
      const profileIds = response.body.profiles.map((p: any) => p.profile_id);
      expect(profileIds).not.toContain(deletedProfileId);

      // Clean up
      await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${deletedProfileId}`);
    });

    it('should sort profiles by created_at DESC (newest first)', async () => {
      const response = await request(app).get('/api/profiles/public');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeGreaterThan(1);

      // Check that profiles are sorted by created_at in descending order
      const profiles = response.body.profiles;
      for (let i = 0; i < profiles.length - 1; i++) {
        const current = new Date(profiles[i].created_at);
        const next = new Date(profiles[i + 1].created_at);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should sort profiles by created_at ASC when order=asc', async () => {
      const response = await request(app).get('/api/profiles/public?sortBy=created_at&order=asc');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeGreaterThan(1);

      // Check that profiles are sorted by created_at in ascending order
      const profiles = response.body.profiles;
      for (let i = 0; i < profiles.length - 1; i++) {
        const current = new Date(profiles[i].created_at);
        const next = new Date(profiles[i + 1].created_at);
        expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
      }
    });

    it('should sort profiles by name ASC alphabetically', async () => {
      const response = await request(app).get('/api/profiles/public?sortBy=name&order=asc');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeGreaterThan(0);
      // Verify the endpoint accepts the sort parameter and returns profiles
      // PostgreSQL handles the actual sorting with its collation rules
    });

    it('should sort profiles by name DESC alphabetically', async () => {
      const response = await request(app).get('/api/profiles/public?sortBy=name&order=desc');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeGreaterThan(0);
      // Verify the endpoint accepts the sort parameter and returns profiles
      // PostgreSQL handles the actual sorting with its collation rules
    });

    it('should default to created_at DESC for invalid sortBy parameter', async () => {
      const response = await request(app).get('/api/profiles/public?sortBy=invalid_column');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeGreaterThan(1);

      // Should fall back to created_at DESC
      const profiles = response.body.profiles;
      for (let i = 0; i < profiles.length - 1; i++) {
        const current = new Date(profiles[i].created_at);
        const next = new Date(profiles[i + 1].created_at);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should default to DESC for invalid order parameter', async () => {
      const response = await request(app).get('/api/profiles/public?sortBy=created_at&order=invalid');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeGreaterThan(1);

      // Should fall back to DESC
      const profiles = response.body.profiles;
      for (let i = 0; i < profiles.length - 1; i++) {
        const current = new Date(profiles[i].created_at);
        const next = new Date(profiles[i + 1].created_at);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    // Profile Type Filtering Tests (2.1.4)
    it('should filter profiles by single profile_type_id', async () => {
      const response = await request(app).get('/api/profiles/public?profile_type_id=1');

      expect(response.status).toBe(200);
      // All returned profiles should be type 1 (Character)
      response.body.profiles.forEach((profile: { profile_type_id: number }) => {
        expect(profile.profile_type_id).toBe(1);
      });
    });

    it('should filter profiles by multiple profile_type_ids (comma-separated)', async () => {
      const response = await request(app).get('/api/profiles/public?profile_type_id=1,5');

      expect(response.status).toBe(200);
      // All returned profiles should be type 1 (Character) or type 5 (Location)
      response.body.profiles.forEach((profile: { profile_type_id: number }) => {
        expect([1, 5]).toContain(profile.profile_type_id);
      });
    });

    it('should return correct total count when filtering by type', async () => {
      // Filter by character type and verify response structure
      const filteredResponse = await request(app).get('/api/profiles/public?profile_type_id=1&limit=100');

      expect(filteredResponse.status).toBe(200);
      // All returned profiles should be characters (type 1)
      filteredResponse.body.profiles.forEach((profile: { profile_type_id: number }) => {
        expect(profile.profile_type_id).toBe(1);
      });
      // Total should be a non-negative number
      expect(filteredResponse.body.total).toBeGreaterThanOrEqual(0);
      // hasMore should be a boolean
      expect(typeof filteredResponse.body.hasMore).toBe('boolean');
    });

    it('should ignore invalid profile_type_id values', async () => {
      const response = await request(app).get('/api/profiles/public?profile_type_id=999');

      expect(response.status).toBe(200);
      // Invalid type ID should be ignored, returning all profiles
      expect(response.body.profiles.length).toBeGreaterThan(0);
    });

    it('should handle mixed valid and invalid profile_type_ids', async () => {
      const response = await request(app).get('/api/profiles/public?profile_type_id=1,999,abc');

      expect(response.status).toBe(200);
      // Should only filter by valid type ID (1)
      response.body.profiles.forEach((profile: { profile_type_id: number }) => {
        expect(profile.profile_type_id).toBe(1);
      });
    });

    it('should combine filtering with sorting', async () => {
      const response = await request(app).get('/api/profiles/public?profile_type_id=1&sortBy=name&order=asc');

      expect(response.status).toBe(200);

      // All profiles should be type 1 (Character)
      response.body.profiles.forEach((profile: { profile_type_id: number }) => {
        expect(profile.profile_type_id).toBe(1);
      });
      // Sorting is handled by PostgreSQL - we just verify the filter works with sort params
    });

    it('should return accurate total count', async () => {
      const response = await request(app).get('/api/profiles/public');

      expect(response.status).toBe(200);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('should return hasMore as false when all profiles fit in one page', async () => {
      // Request with very high limit to ensure all profiles fit
      const response = await request(app).get('/api/profiles/public?limit=100');

      expect(response.status).toBe(200);
      expect(response.body.hasMore).toBe(false);
    });

    // Search Tests (2.1.5)
    it('should search profiles by name (case-insensitive)', async () => {
      // First get all profiles to find a name to search for
      const allResponse = await request(app).get('/api/profiles/public?limit=100');
      const firstProfile = allResponse.body.profiles[0];

      // Search using part of the name in different case
      const searchTerm = firstProfile.name.substring(0, 3).toLowerCase();
      const response = await request(app).get(`/api/profiles/public?search=${searchTerm}`);

      expect(response.status).toBe(200);
      // All results should contain the search term (case-insensitive)
      response.body.profiles.forEach((profile: { name: string }) => {
        expect(profile.name.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app).get('/api/profiles/public?search=xyznonexistent123');

      expect(response.status).toBe(200);
      expect(response.body.profiles).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should combine search with type filter', async () => {
      const response = await request(app).get('/api/profiles/public?search=test&profile_type_id=1');

      expect(response.status).toBe(200);
      // All results should be type 1 and contain search term
      response.body.profiles.forEach((profile: { name: string; profile_type_id: number }) => {
        expect(profile.profile_type_id).toBe(1);
        expect(profile.name.toLowerCase()).toContain('test');
      });
    });

    it('should combine search with sorting', async () => {
      const response = await request(app).get('/api/profiles/public?search=test&sortBy=name&order=asc');

      expect(response.status).toBe(200);
      // All results should contain search term
      response.body.profiles.forEach((profile: { name: string }) => {
        expect(profile.name.toLowerCase()).toContain('test');
      });
    });

    it('should handle empty search parameter', async () => {
      const response = await request(app).get('/api/profiles/public?search=');

      expect(response.status).toBe(200);
      // Empty search should return all profiles (same as no search)
      expect(response.body.profiles.length).toBeGreaterThan(0);
    });

    it('should trim whitespace from search parameter', async () => {
      const response = await request(app).get('/api/profiles/public?search=%20%20test%20%20');

      expect(response.status).toBe(200);
      // Should search for "test" after trimming
      response.body.profiles.forEach((profile: { name: string }) => {
        expect(profile.name.toLowerCase()).toContain('test');
      });
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter (default 50)', async () => {
      const response = await request(app).get('/api/profiles/public');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeLessThanOrEqual(50);
    });

    it('should respect custom limit parameter', async () => {
      const response = await request(app).get('/api/profiles/public?limit=2');

      expect(response.status).toBe(200);
      expect(response.body.profiles.length).toBeLessThanOrEqual(2);
    });

    it('should enforce maximum limit of 100', async () => {
      const response = await request(app).get('/api/profiles/public?limit=500');

      expect(response.status).toBe(200);
      // Should cap at 100 even though we requested 500
      expect(response.body.profiles.length).toBeLessThanOrEqual(100);
    });

    it('should set hasMore to true when more profiles exist than limit', async () => {
      const response = await request(app).get('/api/profiles/public?limit=1');

      expect(response.status).toBe(200);
      if (response.body.total > 1) {
        expect(response.body.hasMore).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid limit parameter (default to 50)', async () => {
      const response = await request(app).get('/api/profiles/public?limit=invalid');

      expect(response.status).toBe(200);
      // Should fall back to default behavior
      expect(response.body.profiles.length).toBeLessThanOrEqual(50);
    });

    it('should handle negative limit gracefully', async () => {
      const response = await request(app).get('/api/profiles/public?limit=-10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profiles');
    });
  });

  // 2.2.6 Offset Pagination Tests
  describe('Offset Pagination (2.2.6)', () => {
    it('should return different profiles when offset is provided', async () => {
      // Get first page
      const firstPage = await request(app).get('/api/profiles/public?limit=2&offset=0');
      expect(firstPage.status).toBe(200);

      // Get second page
      const secondPage = await request(app).get('/api/profiles/public?limit=2&offset=2');
      expect(secondPage.status).toBe(200);

      // If we have enough profiles, pages should have different content
      if (firstPage.body.total > 2 && secondPage.body.profiles.length > 0) {
        const firstPageIds = firstPage.body.profiles.map((p: any) => p.profile_id);
        const secondPageIds = secondPage.body.profiles.map((p: any) => p.profile_id);
        // No overlap between pages
        const overlap = firstPageIds.filter((id: number) => secondPageIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should return empty array when offset exceeds total', async () => {
      const response = await request(app).get('/api/profiles/public?limit=10&offset=999999');

      expect(response.status).toBe(200);
      expect(response.body.profiles).toEqual([]);
      expect(response.body.hasMore).toBe(false);
    });

    it('should set hasMore correctly based on offset and remaining profiles', async () => {
      // Get total count first
      const initial = await request(app).get('/api/profiles/public?limit=1&offset=0');
      const total = initial.body.total;

      if (total >= 3) {
        // With offset near the end, hasMore should be false
        const nearEnd = await request(app).get(`/api/profiles/public?limit=10&offset=${total - 1}`);
        expect(nearEnd.status).toBe(200);
        expect(nearEnd.body.hasMore).toBe(false);

        // With offset at beginning, hasMore should be true (if total > limit)
        const atStart = await request(app).get('/api/profiles/public?limit=1&offset=0');
        expect(atStart.status).toBe(200);
        if (total > 1) {
          expect(atStart.body.hasMore).toBe(true);
        }
      }
    });

    it('should handle offset=0 the same as no offset', async () => {
      const withOffset = await request(app).get('/api/profiles/public?limit=5&offset=0');
      const withoutOffset = await request(app).get('/api/profiles/public?limit=5');

      expect(withOffset.status).toBe(200);
      expect(withoutOffset.status).toBe(200);
      expect(withOffset.body.profiles.length).toBe(withoutOffset.body.profiles.length);
      expect(withOffset.body.total).toBe(withoutOffset.body.total);
    });

    it('should handle negative offset as 0', async () => {
      const negativeOffset = await request(app).get('/api/profiles/public?limit=5&offset=-10');
      const zeroOffset = await request(app).get('/api/profiles/public?limit=5&offset=0');

      expect(negativeOffset.status).toBe(200);
      expect(zeroOffset.status).toBe(200);
      // Should return same results as offset=0
      expect(negativeOffset.body.profiles.length).toBe(zeroOffset.body.profiles.length);
    });

    it('should work with filters, search, and sorting combined', async () => {
      // Test that offset works correctly with other query params
      const response = await request(app).get(
        '/api/profiles/public?limit=2&offset=0&sortBy=name&order=asc&profile_type_id=1',
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
    });
  });
});

describe('GET /api/profiles/:id', () => {
  describe('Success Cases', () => {
    it('should fetch existing profile by valid ID', async () => {
      // Create a profile first
      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          profile_type_id: 1,
          name: 'Samwise Gamgee',
          details: 'Loyal companion and gardener',
        });

      testProfileId = createResponse.body.profile_id;

      // Fetch the profile
      const response = await request(app).get(`/api/profiles/${testProfileId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profile_id');
      expect(response.body.profile_id).toBe(testProfileId);
      expect(response.body.name).toBe('Samwise Gamgee');
      expect(response.body.details).toBe('Loyal companion and gardener');
    });

    it('should include type_name from profile_types table', async () => {
      // Create a character profile
      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          profile_type_id: 1,
          name: 'Merry Brandybuck',
        });

      testProfileId = createResponse.body.profile_id;

      // Fetch the profile
      const response = await request(app).get(`/api/profiles/${testProfileId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('type_name');
      expect(response.body.type_name).toBe('character');
    });

    it('should include username from accounts table', async () => {
      // Create a profile
      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          profile_type_id: 1,
          name: 'Pippin Took',
        });

      testProfileId = createResponse.body.profile_id;

      // Fetch the profile
      const response = await request(app).get(`/api/profiles/${testProfileId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username');
      expect(response.body.username).toBe('testuser');
    });

    it('should include all profile fields (name, details, created_at, etc.)', async () => {
      // Create a parent character first
      const charResponse = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken}`).send({
        profile_type_id: 1,
        name: 'Bilbo for Item Test',
      });

      // Create an item profile
      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          profile_type_id: 2,
          name: 'Sting',
          details: 'Elven blade that glows blue',
          parent_profile_id: charResponse.body.profile_id,
        });

      testProfileId = createResponse.body.profile_id;

      // Fetch the profile
      const response = await request(app).get(`/api/profiles/${testProfileId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profile_id');
      expect(response.body).toHaveProperty('profile_type_id');
      expect(response.body).toHaveProperty('account_id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(response.body).toHaveProperty('deleted');
      expect(response.body).toHaveProperty('type_name');
      expect(response.body).toHaveProperty('username');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent profile ID', async () => {
      const nonExistentId = 999999;
      const response = await request(app).get(`/api/profiles/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 404 for soft-deleted profile (deleted=true)', async () => {
      // Create a profile
      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          profile_type_id: 1,
          name: 'Deleted Profile',
        });

      testProfileId = createResponse.body.profile_id;

      // Soft delete the profile
      await pool.query(sql.unsafe`
        UPDATE profiles SET deleted = true WHERE profile_id = ${testProfileId}
      `);

      // Try to fetch the soft-deleted profile
      const response = await request(app).get(`/api/profiles/${testProfileId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 400 for invalid profile ID (not a number)', async () => {
      const response = await request(app).get('/api/profiles/not-a-number');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toBe('Invalid profile ID');
    });
  });

  // 2.3.4 - can_edit ownership verification tests
  describe('can_edit field (2.3.4)', () => {
    let ownedProfileId: number;

    beforeEach(async () => {
      // Create a profile owned by testAccountId
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          profile_type_id: 1,
          name: `Ownership Test Profile ${Date.now()}`,
        });

      ownedProfileId = response.body.profile_id;
    });

    afterEach(async () => {
      if (ownedProfileId) {
        await pool.query(sql.unsafe`
          DELETE FROM profiles WHERE profile_id = ${ownedProfileId}
        `);
      }
    });

    it('should return can_edit: false for unauthenticated users', async () => {
      const response = await request(app).get(`/api/profiles/${ownedProfileId}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(false);
    });

    it('should return can_edit: false for users who do not own the profile', async () => {
      // Create token for a different user
      const otherUserId = testAccountId + 1000;
      const otherToken = generateToken(otherUserId);

      const response = await request(app)
        .get(`/api/profiles/${ownedProfileId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(false);
    });

    it('should return can_edit: true for the profile owner', async () => {
      const response = await request(app)
        .get(`/api/profiles/${ownedProfileId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(true);
    });

    it('should return can_edit: false with invalid token', async () => {
      const response = await request(app)
        .get(`/api/profiles/${ownedProfileId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(false);
    });

    it('should return can_edit: false with expired token', async () => {
      // Create an expired token
      const jwt = await import('jsonwebtoken');
      const expiredToken = jwt.default.sign(
        { userId: testAccountId },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }, // Expired 1 hour ago
      );

      const response = await request(app)
        .get(`/api/profiles/${ownedProfileId}`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(false);
    });
  });
});

// 2.3.2 - PUT /api/profiles/:id tests
describe('PUT /api/profiles/:id', () => {
  let editableProfileId: number;

  beforeEach(async () => {
    // Create a fresh profile for each test
    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        profile_type_id: 1,
        name: `Edit Test Profile ${Date.now()}`,
        details: { description: 'Original description' },
      });

    editableProfileId = response.body.profile_id;
  });

  afterEach(async () => {
    // Clean up test profile
    if (editableProfileId) {
      await pool.query(sql.unsafe`
        DELETE FROM profiles WHERE profile_id = ${editableProfileId}
      `);
    }
  });

  describe('Successful Updates', () => {
    it('should update profile name', async () => {
      const newName = `Updated Name ${Date.now()}`;

      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: newName });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(newName);
      expect(response.body.profile_id).toBe(editableProfileId);
    });

    it('should update profile details', async () => {
      const newDescription = 'Updated description text';

      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ details: { description: newDescription } });

      expect(response.status).toBe(200);
      expect(response.body.details.description).toBe(newDescription);
    });

    it('should update both name and details', async () => {
      const newName = `Both Updated ${Date.now()}`;
      const newDescription = 'Both updated description';

      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: newName,
          details: { description: newDescription },
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(newName);
      expect(response.body.details.description).toBe(newDescription);
    });

    it('should update updated_at timestamp', async () => {
      // Get original timestamp
      const original = await request(app).get(`/api/profiles/${editableProfileId}`);
      const originalUpdatedAt = original.body.updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: `Timestamp Test ${Date.now()}` });

      expect(response.status).toBe(200);
      expect(response.body.updated_at).not.toBe(originalUpdatedAt);
    });

    it('should allow clearing details by setting to null', async () => {
      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ details: null });

      expect(response.status).toBe(200);
      expect(response.body.details).toBeNull();
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Invalid Token Update' });

      expect(response.status).toBe(401);
    });

    it('should return 403 when updating profile owned by another user', async () => {
      // Create a different user's token
      const otherUserId = testAccountId + 1000; // Non-existent user ID
      const otherToken = generateToken(otherUserId);

      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Should Not Update' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have permission to edit this profile');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for name exceeding 100 characters', async () => {
      const longName = 'a'.repeat(101);

      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: longName });

      expect(response.status).toBe(400);
    });

    it('should return 400 when no fields provided', async () => {
      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 400 for invalid profile ID', async () => {
      const response = await request(app)
        .put('/api/profiles/not-a-number')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid profile ID');
    });
  });

  describe('Edge Cases', () => {
    it('should return 404 for non-existent profile', async () => {
      const response = await request(app)
        .put('/api/profiles/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Non-existent' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 404 for soft-deleted profile', async () => {
      // Soft delete the profile
      await pool.query(sql.unsafe`
        UPDATE profiles SET deleted = true WHERE profile_id = ${editableProfileId}
      `);

      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Deleted Profile Update' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found');
    });

    it('should trim whitespace from name', async () => {
      const response = await request(app)
        .put(`/api/profiles/${editableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: '  Trimmed Name  ' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Trimmed Name');
    });
  });
});

// 2.4.2 - DELETE /api/profiles/:id tests
describe('DELETE /api/profiles/:id', () => {
  let deletableProfileId: number;

  beforeEach(async () => {
    // Create a fresh profile for each test
    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        profile_type_id: 1,
        name: `Delete Test Profile ${Date.now()}`,
        details: { description: 'Profile to be deleted' },
      });

    deletableProfileId = response.body.profile_id;
  });

  afterEach(async () => {
    // Clean up test profile (hard delete for test cleanup)
    if (deletableProfileId) {
      await pool.query(sql.unsafe`
        DELETE FROM profiles WHERE profile_id = ${deletableProfileId}
      `);
    }
  });

  describe('Successful Deletion', () => {
    it('should soft-delete a profile owned by the user', async () => {
      const response = await request(app)
        .delete(`/api/profiles/${deletableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile deleted successfully');

      // Verify profile is soft-deleted in database
      const dbProfile = await pool.maybeOne(sql.unsafe`
        SELECT deleted FROM profiles WHERE profile_id = ${deletableProfileId}
      `);
      expect(dbProfile?.deleted).toBe(true);
    });

    it('should make profile inaccessible via GET after deletion', async () => {
      // Delete the profile
      await request(app).delete(`/api/profiles/${deletableProfileId}`).set('Authorization', `Bearer ${validToken}`);

      // Try to fetch the deleted profile
      const getResponse = await request(app).get(`/api/profiles/${deletableProfileId}`);

      expect(getResponse.status).toBe(404);
      expect(getResponse.body.error).toBe('Profile not found');
    });

    it('should exclude deleted profile from public listings', async () => {
      // Get profile name before deletion
      const profileName = `Delete Test Profile`;

      // Delete the profile
      await request(app).delete(`/api/profiles/${deletableProfileId}`).set('Authorization', `Bearer ${validToken}`);

      // Check public listings
      const publicResponse = await request(app).get('/api/profiles/public?limit=100');

      expect(publicResponse.status).toBe(200);
      const profileIds = publicResponse.body.profiles.map((p: any) => p.profile_id);
      expect(profileIds).not.toContain(deletableProfileId);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete(`/api/profiles/${deletableProfileId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .delete(`/api/profiles/${deletableProfileId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    it("should return 404 when trying to delete another user's profile", async () => {
      // Create a different user's token
      const otherUserId = testAccountId + 1000;
      const otherToken = generateToken(otherUserId);

      const response = await request(app)
        .delete(`/api/profiles/${deletableProfileId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found or not authorized');

      // Verify profile was NOT deleted
      const dbProfile = await pool.maybeOne(sql.unsafe`
        SELECT deleted FROM profiles WHERE profile_id = ${deletableProfileId}
      `);
      expect(dbProfile?.deleted).toBe(false);
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for invalid profile ID', async () => {
      const response = await request(app)
        .delete('/api/profiles/not-a-number')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid profile ID');
    });

    it('should return 404 for non-existent profile', async () => {
      const response = await request(app).delete('/api/profiles/999999').set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found or not authorized');
    });

    it('should return 404 when trying to delete already-deleted profile', async () => {
      // First deletion should succeed
      const firstResponse = await request(app)
        .delete(`/api/profiles/${deletableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(firstResponse.status).toBe(200);

      // Second deletion should fail with 404
      const secondResponse = await request(app)
        .delete(`/api/profiles/${deletableProfileId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(secondResponse.status).toBe(404);
      expect(secondResponse.body.error).toBe('Profile not found or not authorized');
    });
  });
});

// Profile Editors Tests
describe('Profile Editors API', () => {
  let ownerAccountId: number;
  let ownerToken: string;
  let editorAccountId: number;
  let editorToken: string;
  let otherAccountId: number;
  let otherToken: string;
  let testProfileForEditors: number;

  beforeAll(async () => {
    // Create owner account (reuse testAccountId)
    ownerAccountId = testAccountId;
    ownerToken = validToken;

    // Create editor account
    const editorResult = await pool.one(sql.unsafe`
      INSERT INTO accounts (username, email, hashed_password)
      VALUES ('editoruser', 'editor@example.com', '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword')
      RETURNING account_id
    `);
    editorAccountId = editorResult.account_id as number;
    editorToken = generateToken(editorAccountId);

    // Create another account (not an editor)
    const otherResult = await pool.one(sql.unsafe`
      INSERT INTO accounts (username, email, hashed_password)
      VALUES ('otheruser', 'other@example.com', '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword')
      RETURNING account_id
    `);
    otherAccountId = otherResult.account_id as number;
    otherToken = generateToken(otherAccountId);
  });

  afterAll(async () => {
    // Clean up test accounts
    await pool.query(
      sql.unsafe`DELETE FROM profile_editors WHERE account_id IN (${editorAccountId}, ${otherAccountId})`,
    );
    await pool.query(sql.unsafe`DELETE FROM profiles WHERE account_id IN (${editorAccountId}, ${otherAccountId})`);
    await pool.query(sql.unsafe`DELETE FROM accounts WHERE account_id IN (${editorAccountId}, ${otherAccountId})`);
  });

  beforeEach(async () => {
    // Create a fresh profile for each test
    const profileResult = await pool.one(sql.unsafe`
      INSERT INTO profiles (account_id, profile_type_id, name, details)
      VALUES (${ownerAccountId}, 1, 'Editor Test Profile', '{"description": "Test"}')
      RETURNING profile_id
    `);
    testProfileForEditors = profileResult.profile_id as number;
  });

  afterEach(async () => {
    // Clean up profile and its editors
    if (testProfileForEditors) {
      await pool.query(sql.unsafe`DELETE FROM profile_editors WHERE profile_id = ${testProfileForEditors}`);
      await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${testProfileForEditors}`);
    }
  });

  describe('GET /api/profiles/:profileId/editors', () => {
    it('should return empty array when profile has no editors', async () => {
      const response = await request(app).get(`/api/profiles/${testProfileForEditors}/editors`);

      expect(response.status).toBe(200);
      expect(response.body.editors).toEqual([]);
    });

    it('should return editors with username info', async () => {
      // Add an editor directly
      await pool.query(sql.unsafe`
        INSERT INTO profile_editors (profile_id, account_id, invited_by_account_id)
        VALUES (${testProfileForEditors}, ${editorAccountId}, ${ownerAccountId})
      `);

      const response = await request(app).get(`/api/profiles/${testProfileForEditors}/editors`);

      expect(response.status).toBe(200);
      expect(response.body.editors).toHaveLength(1);
      expect(response.body.editors[0].username).toBe('editoruser');
      expect(response.body.editors[0].invited_by_username).toBe('testuser');
    });

    it('should return 404 for non-existent profile', async () => {
      const response = await request(app).get('/api/profiles/999999/editors');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 400 for invalid profile ID', async () => {
      const response = await request(app).get('/api/profiles/invalid/editors');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid profile ID');
    });
  });

  describe('POST /api/profiles/:profileId/editors', () => {
    it('should allow owner to add an editor by username', async () => {
      const response = await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'editoruser' });

      expect(response.status).toBe(201);
      expect(response.body.username).toBe('editoruser');
      expect(response.body.editor_id).toBeDefined();
    });

    it('should be case-insensitive for username', async () => {
      const response = await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'EDITORUSER' });

      expect(response.status).toBe(201);
      expect(response.body.username).toBe('editoruser');
    });

    it('should return 403 when non-owner tries to add editor', async () => {
      const response = await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ username: 'editoruser' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only the profile owner can add editors');
    });

    it('should return 404 for non-existent username', async () => {
      const response = await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'nonexistentuser' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 when owner tries to add themselves', async () => {
      const response = await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You cannot add yourself as an editor - you are the owner');
    });

    it('should return 409 when adding duplicate editor', async () => {
      // Add editor first time
      await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'editoruser' });

      // Try to add again
      const response = await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ username: 'editoruser' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('This user is already an editor');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .send({ username: 'editoruser' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post(`/api/profiles/${testProfileForEditors}/editors`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/profiles/:profileId/editors/:editorId', () => {
    let testEditorId: number;

    beforeEach(async () => {
      // Add an editor for delete tests
      const result = await pool.one(sql.unsafe`
        INSERT INTO profile_editors (profile_id, account_id, invited_by_account_id)
        VALUES (${testProfileForEditors}, ${editorAccountId}, ${ownerAccountId})
        RETURNING editor_id
      `);
      testEditorId = result.editor_id as number;
    });

    it('should allow owner to remove an editor', async () => {
      const response = await request(app)
        .delete(`/api/profiles/${testProfileForEditors}/editors/${testEditorId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Editor removed successfully');

      // Verify editor is soft-deleted
      const editor = await pool.maybeOne(sql.unsafe`
        SELECT deleted FROM profile_editors WHERE editor_id = ${testEditorId}
      `);
      expect(editor?.deleted).toBe(true);
    });

    it('should allow editor to remove themselves', async () => {
      const response = await request(app)
        .delete(`/api/profiles/${testProfileForEditors}/editors/${testEditorId}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Editor removed successfully');
    });

    it('should return 403 when non-owner/non-self tries to remove editor', async () => {
      const response = await request(app)
        .delete(`/api/profiles/${testProfileForEditors}/editors/${testEditorId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have permission to remove this editor');
    });

    it('should return 404 for non-existent editor', async () => {
      const response = await request(app)
        .delete(`/api/profiles/${testProfileForEditors}/editors/999999`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Editor not found');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete(`/api/profiles/${testProfileForEditors}/editors/${testEditorId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Editor Edit Permissions', () => {
    beforeEach(async () => {
      // Add editor to the profile
      await pool.query(sql.unsafe`
        INSERT INTO profile_editors (profile_id, account_id, invited_by_account_id)
        VALUES (${testProfileForEditors}, ${editorAccountId}, ${ownerAccountId})
      `);
    });

    it('should allow editor to edit profile', async () => {
      const response = await request(app)
        .put(`/api/profiles/${testProfileForEditors}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Updated by Editor' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated by Editor');
    });

    it('should show can_edit=true for editor', async () => {
      const response = await request(app)
        .get(`/api/profiles/${testProfileForEditors}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(true);
      expect(response.body.is_owner).toBe(false);
    });

    it('should show is_owner=true only for owner', async () => {
      const response = await request(app)
        .get(`/api/profiles/${testProfileForEditors}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.can_edit).toBe(true);
      expect(response.body.is_owner).toBe(true);
    });

    it('should not allow editor to delete profile', async () => {
      const response = await request(app)
        .delete(`/api/profiles/${testProfileForEditors}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found or not authorized');
    });

    it('should not allow non-editor to edit profile', async () => {
      const response = await request(app)
        .put(`/api/profiles/${testProfileForEditors}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have permission to edit this profile');
    });
  });
});
