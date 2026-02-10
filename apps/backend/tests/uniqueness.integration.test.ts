import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express, { Express } from 'express';
import { createPool, DatabasePool } from 'slonik';
import { sql } from 'slonik';

// Test app setup
let app: Express;
let pool: DatabasePool;
let testAccountId1: number;
let testAccountId2: number;
let testCharacterId: number;
let validToken1: string;
let validToken2: string;
let createdProfileIds: number[] = [];

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

// Helper function to generate JWT token
const generateToken = (accountId: number, expiresIn: string = '1h'): string => {
  return jwt.sign({ userId: accountId }, JWT_SECRET, { expiresIn } as any);
};

beforeAll(async () => {
  // Setup test database connection
  const { DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const DB_HOST = 'localhost';
  const DB_PORT = '5433'; // Host port mapped from container's 5432

  pool = await createPool(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

  // Mock the database module to return our test pool
  vi.doMock('../src/config/database.js', () => ({
    default: Promise.resolve(pool),
  }));

  // Import routes AFTER mocking the database
  const { default: authRoutes } = await import('../src/routes/auth.js');
  const { default: profilesRoutes } = await import('../src/routes/profiles.js');

  // Setup Express app
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/profiles', profilesRoutes);

  // Generate unique usernames using timestamp to avoid conflicts
  const timestamp = Date.now();
  const username1 = `testuser_unique_${timestamp}_1`;
  const username2 = `testuser_unique_${timestamp}_2`;

  // Create two test accounts for uniqueness testing
  const result1 = await pool.one(sql.unsafe`
    INSERT INTO accounts (username, email, hashed_password)
    VALUES (${username1}, ${`test_${timestamp}_1@example.com`}, '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword')
    RETURNING account_id
  `);
  testAccountId1 = result1.account_id as number;

  const result2 = await pool.one(sql.unsafe`
    INSERT INTO accounts (username, email, hashed_password)
    VALUES (${username2}, ${`test_${timestamp}_2@example.com`}, '$argon2id$v=19$m=65536,t=3,p=4$somehashedpassword')
    RETURNING account_id
  `);
  testAccountId2 = result2.account_id as number;

  // Generate valid tokens for both test accounts
  validToken1 = generateToken(testAccountId1);
  validToken2 = generateToken(testAccountId2);
});

afterAll(async () => {
  // Clean up test data
  if (testAccountId1) {
    await pool.query(sql.unsafe`DELETE FROM profiles WHERE account_id = ${testAccountId1}`);
    await pool.query(sql.unsafe`DELETE FROM accounts WHERE account_id = ${testAccountId1}`);
  }
  if (testAccountId2) {
    await pool.query(sql.unsafe`DELETE FROM profiles WHERE account_id = ${testAccountId2}`);
    await pool.query(sql.unsafe`DELETE FROM accounts WHERE account_id = ${testAccountId2}`);
  }
  await pool.end();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // Reset created profile IDs before each test
  createdProfileIds = [];
  testCharacterId = 0;
});

afterEach(async () => {
  // Clean up any profiles created during tests
  if (createdProfileIds.length > 0) {
    for (const id of createdProfileIds) {
      await pool.query(sql.unsafe`DELETE FROM profiles WHERE profile_id = ${id}`).catch(() => {});
    }
  }
});

describe('Unique Profile Names - Commit 2.1.3', () => {
  describe('Character Names - Global Uniqueness', () => {
    it('should create a character with unique name successfully', async () => {
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'Aragorn',
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Aragorn');
      expect(response.body.profile_type_id).toBe(1);

      createdProfileIds.push(response.body.profile_id);
    });

    it('should prevent duplicate character name from SAME account', async () => {
      // Create first character
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'Frodo',
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Try to create duplicate from same account
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'Frodo',
      });

      expect(response2.status).toBe(409);
      expect(response2.body.error).toBe('There is already a profile with this name');
    });

    it('should prevent duplicate character name from DIFFERENT account (global uniqueness)', async () => {
      // Account 1 creates character
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'Gandalf',
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Account 2 tries to create character with same name
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken2}`).send({
        profile_type_id: 1,
        name: 'Gandalf',
      });

      expect(response2.status).toBe(409);
      expect(response2.body.message).toBe('There is already a profile with this name');
    });

    it('should allow reusing character name after soft delete', async () => {
      // Create character
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'Boromir',
      });

      expect(response1.status).toBe(201);
      const profileId = response1.body.profile_id;
      createdProfileIds.push(profileId);

      // Soft delete the character
      await pool.query(sql.unsafe`
        UPDATE profiles SET deleted = true WHERE profile_id = ${profileId}
      `);

      // Create new character with same name (should succeed)
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken2}`).send({
        profile_type_id: 1,
        name: 'Boromir',
      });

      expect(response2.status).toBe(201);
      expect(response2.body.name).toBe('Boromir');
      createdProfileIds.push(response2.body.profile_id);
    });

    it('should treat character names as case-sensitive', async () => {
      // Create "Legolas"
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'Legolas',
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Try to create "legolas" (different case)
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken2}`).send({
        profile_type_id: 1,
        name: 'legolas',
      });

      // Should succeed (case-sensitive)
      expect(response2.status).toBe(201);
      createdProfileIds.push(response2.body.profile_id);
    });
  });

  describe('Other Profile Types - Per-Account Uniqueness', () => {
    beforeEach(async () => {
      // Create a character for testing child profiles
      const response = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'TestCharacter',
      });
      testCharacterId = response.body.profile_id;
      createdProfileIds.push(testCharacterId);
    });

    it('should allow same item name across DIFFERENT accounts', async () => {
      // Account 1 creates item
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 2,
        name: 'Sting',
        parent_profile_id: testCharacterId,
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Create another character for account 2
      const charResponse = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken2}`).send({
        profile_type_id: 1,
        name: 'TestCharacter2',
      });
      createdProfileIds.push(charResponse.body.profile_id);

      // Account 2 creates item with same name (should succeed)
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken2}`).send({
        profile_type_id: 2,
        name: 'Sting',
        parent_profile_id: charResponse.body.profile_id,
      });

      expect(response2.status).toBe(201);
      expect(response2.body.name).toBe('Sting');
      createdProfileIds.push(response2.body.profile_id);
    });

    it('should prevent duplicate item name within SAME account', async () => {
      // Create first item
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 2,
        name: 'Anduril',
        parent_profile_id: testCharacterId,
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Try to create duplicate item in same account
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 2,
        name: 'Anduril',
        parent_profile_id: testCharacterId,
      });

      expect(response2.status).toBe(409);
      expect(response2.body.error).toBe('There is already a profile with this name');
    });

    it('should allow same kinship name across DIFFERENT accounts', async () => {
      // Account 1 creates kinship
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 3,
        name: 'Fellowship',
        parent_profile_id: testCharacterId,
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Create character for account 2
      const charResponse = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken2}`).send({
        profile_type_id: 1,
        name: 'TestCharacter3',
      });
      createdProfileIds.push(charResponse.body.profile_id);

      // Account 2 creates kinship with same name (should succeed)
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken2}`).send({
        profile_type_id: 3,
        name: 'Fellowship',
        parent_profile_id: charResponse.body.profile_id,
      });

      expect(response2.status).toBe(201);
      createdProfileIds.push(response2.body.profile_id);
    });

    it('should allow same location name across DIFFERENT accounts', async () => {
      // Account 1 creates location
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 5,
        name: 'The Shire',
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Account 2 creates location with same name (should succeed)
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken2}`).send({
        profile_type_id: 5,
        name: 'The Shire',
      });

      expect(response2.status).toBe(201);
      expect(response2.body.name).toBe('The Shire');
      createdProfileIds.push(response2.body.profile_id);
    });

    it('should prevent duplicate location name within SAME account', async () => {
      // Create first location
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 5,
        name: 'Rivendell',
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Try to create duplicate location in same account
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 5,
        name: 'Rivendell',
      });

      expect(response2.status).toBe(409);
      expect(response2.body.error).toBe('There is already a profile with this name');
    });
  });

  describe('Cross-Type Name Uniqueness', () => {
    it('should allow same name for character and location in same account', async () => {
      // Create character named "Rohan"
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'Rohan',
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Create location named "Rohan" (should succeed - different type)
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 5,
        name: 'Rohan',
      });

      expect(response2.status).toBe(201);
      expect(response2.body.name).toBe('Rohan');
      createdProfileIds.push(response2.body.profile_id);
    });

    it('should allow same name for item and organization in same account', async () => {
      // Create character first
      const charResponse = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 1,
        name: 'ItemOrgTestChar',
      });
      const charId = charResponse.body.profile_id;
      createdProfileIds.push(charId);

      // Create item named "Rangers"
      const response1 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 2,
        name: 'Rangers',
        parent_profile_id: charId,
      });

      expect(response1.status).toBe(201);
      createdProfileIds.push(response1.body.profile_id);

      // Create organization named "Rangers" (should succeed - different type)
      const response2 = await request(app).post('/api/profiles').set('Authorization', `Bearer ${validToken1}`).send({
        profile_type_id: 4,
        name: 'Rangers',
        parent_profile_id: charId,
      });

      expect(response2.status).toBe(201);
      expect(response2.body.name).toBe('Rangers');
      createdProfileIds.push(response2.body.profile_id);
    });
  });
});
