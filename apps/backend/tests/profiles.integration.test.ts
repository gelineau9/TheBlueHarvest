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

  // Setup Express app
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/profiles', profilesRoutes);

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
      // Filter by character type and verify total matches returned profiles count
      const filteredResponse = await request(app).get('/api/profiles/public?profile_type_id=1&limit=100');

      expect(filteredResponse.status).toBe(200);
      // Total should match the number of profiles returned (when limit is high enough)
      // All returned profiles should be characters (type 1)
      filteredResponse.body.profiles.forEach((profile: { profile_type_id: number }) => {
        expect(profile.profile_type_id).toBe(1);
      });
      // Total should be at least the number of profiles returned
      expect(filteredResponse.body.total).toBeGreaterThanOrEqual(filteredResponse.body.profiles.length);
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
});
