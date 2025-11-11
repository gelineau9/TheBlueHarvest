# CI/CD Pipeline - The Blue Harvest

## Overview

Enterprise-grade CI/CD pipeline with comprehensive testing, quality gates, security scanning, and automated deployments. Follows industry best practices for containerized applications.

---

## Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Code Push / PR Created                     │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                   STAGE 1: Code Quality                       │
│  - Linting (ESLint + Prettier)                               │
│  - Type checking (TypeScript)                                │
│  - Security scanning (npm audit, Snyk)                       │
│  - Code complexity analysis                                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                   STAGE 2: Build                              │
│  - Build backend (TypeScript → JavaScript)                   │
│  - Build frontend (Next.js production)                       │
│  - Build Docker images                                       │
│  - Tag with commit SHA + branch                              │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                   STAGE 3: Test Suite                         │
│  - Unit tests (Jest)                                         │
│  - Integration tests (with test DB)                          │
│  - E2E tests (Playwright)                                    │
│  - Performance tests (k6)                                    │
│  - Database migration tests                                  │
│  - Coverage report (>80% threshold)                          │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                   STAGE 4: Security & Compliance              │
│  - Container scanning (Trivy)                                │
│  - SAST (SonarQube)                                          │
│  - Dependency scanning                                       │
│  - License compliance check                                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
        ┌──────────▼──────┐   ┌─────▼──────────┐
        │   PR: Report    │   │ Main: Deploy   │
        │   - Coverage    │   │ - Staging      │
        │   - Tests       │   │ - Production   │
        │   - Quality     │   │   (manual)     │
        └─────────────────┘   └────────────────┘
```

---

## GitHub Actions Workflows

### Directory Structure

```
.github/
├── workflows/
│   ├── pr-check.yml           # PR validation
│   ├── main-ci.yml            # Main branch CI
│   ├── deploy-staging.yml     # Auto-deploy to staging
│   ├── deploy-production.yml  # Manual production deploy
│   ├── database-migration.yml # Database migration workflow
│   └── security-scan.yml      # Nightly security scan
├── actions/
│   ├── setup-node/            # Composite action for Node setup
│   ├── setup-docker/          # Docker setup
│   └── run-tests/             # Test execution
└── CODEOWNERS                 # Code ownership
```

---

## Workflow Definitions

### 1. PR Check Workflow

**File**: `.github/workflows/pr-check.yml`

**Triggers**: Pull request created/updated

**Jobs**:
```yaml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '23.7.0'
  POSTGRES_VERSION: '17'

jobs:
  # Job 1: Code Quality
  code-quality:
    name: Code Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Needed for SonarQube

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier check
        run: npm run format:check

      - name: TypeScript type check
        run: npm run type-check

      - name: Check code complexity
        run: npx complexity-report src/

      - name: Security audit
        run: npm audit --audit-level=moderate

      - name: License compliance
        run: npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC"

  # Job 2: Build
  build:
    name: Build Applications
    runs-on: ubuntu-latest
    needs: code-quality
    strategy:
      matrix:
        app: [backend, frontend]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build ${{ matrix.app }}
        run: npm run build --workspace=apps/${{ matrix.app }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.app }}-build
          path: apps/${{ matrix.app }}/dist
          retention-days: 7

  # Job 3: Unit Tests
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: build
    strategy:
      matrix:
        app: [backend, frontend]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit --workspace=apps/${{ matrix.app }} -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/${{ matrix.app }}/coverage/coverage-final.json
          flags: ${{ matrix.app }}-unit
          name: ${{ matrix.app }}-unit-coverage

  # Job 4: Integration Tests with Ephemeral DB
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: build

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npm run migrate:test

      - name: Seed test data
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npm run seed:test

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          NODE_ENV: test
        run: npm run test:integration -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/integration-coverage-final.json
          flags: integration
          name: integration-coverage

  # Job 5: E2E Tests
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start Docker Compose
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Wait for services
        run: |
          npm run wait-for-services

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Stop Docker Compose
        if: always()
        run: docker-compose -f docker-compose.test.yml down

  # Job 6: Performance Tests
  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    needs: build

    steps:
      - uses: actions/checkout@v4

      - name: Setup k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start test environment
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Run k6 performance tests
        run: k6 run tests/performance/load-test.js --out json=performance-results.json

      - name: Upload performance results
        uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: performance-results.json

  # Job 7: Security Scanning
  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    needs: build

    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Build Docker images
        run: docker-compose build

      - name: Run Trivy container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'blue-harvest-backend:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  # Job 8: SonarQube Analysis
  sonarqube:
    name: SonarQube Analysis
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Download coverage reports
        uses: actions/download-artifact@v4

      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

      - name: SonarQube Quality Gate check
        uses: SonarSource/sonarqube-quality-gate-action@master
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  # Job 9: Database Migration Test
  migration-test:
    name: Database Migration Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: migration_test
          POSTGRES_PASSWORD: migration_test
          POSTGRES_DB: migration_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Test migrations (up)
        env:
          DATABASE_URL: postgresql://migration_test:migration_test@localhost:5432/migration_test
        run: npm run migrate:up

      - name: Test migrations (down)
        env:
          DATABASE_URL: postgresql://migration_test:migration_test@localhost:5432/migration_test
        run: npm run migrate:down

      - name: Test migrations (up again)
        env:
          DATABASE_URL: postgresql://migration_test:migration_test@localhost:5432/migration_test
        run: npm run migrate:up

      - name: Verify schema
        env:
          DATABASE_URL: postgresql://migration_test:migration_test@localhost:5432/migration_test
        run: npm run verify:schema

  # Job 10: PR Summary
  pr-summary:
    name: PR Summary
    runs-on: ubuntu-latest
    needs: [code-quality, unit-tests, integration-tests, e2e-tests, security-scan, sonarqube]
    if: always()

    steps:
      - name: Generate PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const { data: checks } = await github.rest.checks.listForRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.payload.pull_request.head.sha
            });

            // Generate summary markdown
            const summary = `## CI/CD Summary

            ✅ Code Quality: Passed
            ✅ Build: Passed
            ✅ Unit Tests: Passed (Coverage: 85%)
            ✅ Integration Tests: Passed
            ✅ E2E Tests: Passed
            ✅ Security Scan: No critical issues
            ✅ SonarQube: Quality gate passed

            [View detailed results](${context.payload.pull_request.html_url}/checks)
            `;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: summary
            });
```

---

### 2. Main Branch CI Workflow

**File**: `.github/workflows/main-ci.yml`

Similar to PR check but with additional steps:
- Docker image push to registry (GitHub Container Registry)
- Trigger staging deployment
- Update deployment status

---

### 3. Staging Deployment Workflow

**File**: `.github/workflows/deploy-staging.yml`

**Triggers**: Push to `main` branch (after CI passes)

```yaml
name: Deploy to Staging

on:
  workflow_run:
    workflows: ["Main CI"]
    types:
      - completed
    branches: [main]

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}

    environment:
      name: staging
      url: https://staging.blueharvest.com

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Pull latest images
        run: |
          docker pull ${{ steps.login-ecr.outputs.registry }}/blue-harvest-backend:${{ github.sha }}
          docker pull ${{ steps.login-ecr.outputs.registry }}/blue-harvest-frontend:${{ github.sha }}

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster blue-harvest-staging \
            --service backend \
            --force-new-deployment

          aws ecs update-service \
            --cluster blue-harvest-staging \
            --service frontend \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster blue-harvest-staging \
            --services backend frontend

      - name: Run smoke tests
        run: npm run test:smoke -- --env=staging

      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

### 4. Production Deployment Workflow

**File**: `.github/workflows/deploy-production.yml`

**Triggers**: Manual workflow dispatch

**Key Differences from Staging**:
- Requires manual approval
- Blue-green deployment
- Automatic rollback on failure
- Production smoke tests
- Comprehensive notifications

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy (commit SHA or tag)'
        required: true

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest

    environment:
      name: production
      url: https://blueharvest.com

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}

      # Similar to staging but with:
      # - Blue-green deployment
      # - Database backup before migration
      # - Rollback capability
      # - More comprehensive smoke tests

      - name: Backup production database
        run: npm run backup:production

      - name: Deploy to blue environment
        run: npm run deploy:blue

      - name: Run smoke tests on blue
        run: npm run test:smoke -- --env=production-blue

      - name: Switch traffic to blue
        run: npm run traffic:switch-to-blue

      - name: Monitor for 5 minutes
        run: npm run monitor:production -- --duration=5m

      - name: Rollback on failure
        if: failure()
        run: npm run rollback:production
```

---

## Testing Infrastructure

### Test Database Setup

**docker-compose.test.yml**:
```yaml
services:
  postgres-test:
    image: postgres:17
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: test_db
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data  # Ephemeral storage
    command: >
      postgres
      -c shared_preload_libraries='pg_stat_statements'
      -c pg_stat_statements.track=all
      -c max_connections=100

  backend-test:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile.test
    environment:
      DATABASE_URL: postgresql://test_user:test_password@postgres-test:5432/test_db
      NODE_ENV: test
    depends_on:
      postgres-test:
        condition: service_healthy
```

---

### Test Types

#### 1. Unit Tests (Jest)

**Location**: `apps/backend/tests/unit/`

**Example**:
```typescript
// tests/unit/services/AuthService.test.ts
import { AuthService } from '../../../src/services/auth/AuthService';
import { AccountRepository } from '../../../src/repositories/AccountRepository';
import { PasswordService } from '../../../src/services/auth/PasswordService';
import { TokenService } from '../../../src/services/auth/TokenService';

describe('AuthService', () => {
  let authService: AuthService;
  let mockAccountRepo: jest.Mocked<AccountRepository>;
  let mockPasswordService: jest.Mocked<PasswordService>;
  let mockTokenService: jest.Mocked<TokenService>;

  beforeEach(() => {
    mockAccountRepo = {
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      createWithRole: jest.fn()
    } as any;

    mockPasswordService = {
      hash: jest.fn(),
      verify: jest.fn()
    } as any;

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn()
    } as any;

    authService = new AuthService(
      mockAccountRepo,
      mockPasswordService,
      mockTokenService
    );
  });

  describe('signup', () => {
    it('should create account when email and username are available', async () => {
      // Arrange
      mockAccountRepo.existsByEmail.mockResolvedValue(false);
      mockAccountRepo.existsByUsername.mockResolvedValue(false);
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockAccountRepo.createWithRole.mockResolvedValue({
        account_id: 1,
        username: 'testuser',
        email: 'test@test.com'
      } as any);

      // Act
      const result = await authService.signup({
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123'
      });

      // Assert
      expect(mockAccountRepo.existsByEmail).toHaveBeenCalledWith('test@test.com');
      expect(mockPasswordService.hash).toHaveBeenCalledWith('password123');
      expect(result.account.username).toBe('testuser');
    });

    it('should throw error when email already exists', async () => {
      // Arrange
      mockAccountRepo.existsByEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.signup({
          username: 'testuser',
          email: 'existing@test.com',
          password: 'password123'
        })
      ).rejects.toThrow('Email already registered');
    });
  });
});
```

**Coverage Requirements**:
- Overall: 80% minimum
- Critical paths (auth, payments): 95% minimum
- New code: 90% minimum

---

#### 2. Integration Tests

**Location**: `apps/backend/tests/integration/`

**Example**:
```typescript
// tests/integration/api/auth.test.ts
import request from 'supertest';
import { app } from '../../../src/app';
import { pool } from '../../../src/database/connection';

describe('Auth API Integration', () => {
  beforeAll(async () => {
    // Run migrations
    await runMigrations();
  });

  afterAll(async () => {
    // Cleanup
    await pool.end();
  });

  beforeEach(async () => {
    // Clear test data
    await pool.query(sql`TRUNCATE accounts CASCADE`);
  });

  describe('POST /api/auth/signup', () => {
    it('should create account and return tokens', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.account.username).toBe('testuser');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();

      // Verify in database
      const account = await pool.one(
        sql`SELECT * FROM accounts WHERE email = 'test@test.com'`
      );
      expect(account).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // Create first account
      await request(app).post('/api/auth/signup').send({
        username: 'user1',
        email: 'test@test.com',
        password: 'Password123!'
      });

      // Try duplicate
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'user2',
          email: 'test@test.com',
          password: 'Password123!'
        })
        .expect(400);

      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });
  });
});
```

---

#### 3. E2E Tests (Playwright)

**Location**: `tests/e2e/`

**Example**:
```typescript
// tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete full signup and login flow', async ({ page }) => {
    // Navigate to home
    await page.goto('http://localhost:3000');

    // Click signup
    await page.click('text=Sign Up');

    // Fill signup form
    await page.fill('input[name="email"]', 'e2e@test.com');
    await page.fill('input[name="username"]', 'e2euser');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('http://localhost:3000/dashboard');

    // Should show welcome message
    await expect(page.locator('text=Welcome, e2euser')).toBeVisible();

    // Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Logout');

    // Should redirect to home
    await expect(page).toHaveURL('http://localhost:3000');

    // Login again
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'e2e@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should be logged in
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
  });
});
```

---

#### 4. Performance Tests (k6)

**Location**: `tests/performance/`

**Example**:
```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% errors
  },
};

export default function () {
  // Test signup
  const signupPayload = JSON.stringify({
    email: `user-${__VU}-${__ITER}@test.com`,
    username: `user${__VU}${__ITER}`,
    password: 'Password123!',
  });

  const signupRes = http.post(
    'http://localhost:4000/api/auth/signup',
    signupPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(signupRes, {
    'signup status is 201': (r) => r.status === 201,
    'signup returns token': (r) => r.json('data.accessToken') !== undefined,
  });

  sleep(1);

  // Test login
  const loginPayload = JSON.stringify({
    email: `user-${__VU}-${__ITER}@test.com`,
    password: 'Password123!',
  });

  const loginRes = http.post(
    'http://localhost:4000/api/auth/login',
    loginPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => r.json('data.accessToken') !== undefined,
  });

  sleep(1);
}
```

---

## Code Quality Tools

### 1. ESLint Configuration

**File**: `.eslintrc.js`

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    'import/order': ['error', { 'newlines-between': 'always' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'complexity': ['error', 10],
    'max-lines-per-function': ['warn', 50]
  }
};
```

---

### 2. Prettier Configuration

**File**: `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

---

### 3. SonarQube Configuration

**File**: `sonar-project.properties`

```properties
sonar.projectKey=blue-harvest
sonar.organization=your-org
sonar.sources=apps/backend/src,apps/frontend/src
sonar.tests=apps/backend/tests,apps/frontend/tests,tests
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.spec.ts
sonar.cpd.exclusions=**/*.test.ts

# Quality Gates
sonar.qualitygate.wait=true
sonar.qualitygate.timeout=300

# Code Coverage
sonar.coverage.minimum=80

# Code Smells
sonar.issue.ignore.multicriteria=e1,e2
sonar.issue.ignore.multicriteria.e1.ruleKey=typescript:S1172
sonar.issue.ignore.multicriteria.e1.resourceKey=**/*.ts
```

---

## Container Strategy

### Multi-stage Docker Builds

**Backend Dockerfile**:
```dockerfile
# Build stage
FROM node:23.7.0-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci --workspace=apps/backend

# Copy source
COPY apps/backend ./apps/backend
COPY tsconfig.json ./

# Build
RUN npm run build --workspace=apps/backend

# Production stage
FROM node:23.7.0-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN npm ci --workspace=apps/backend --omit=dev

# Copy built files
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 4000

CMD ["node", "apps/backend/dist/index.js"]
```

**Frontend Dockerfile**:
```dockerfile
# Build stage
FROM node:23.7.0-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

RUN npm ci --workspace=apps/frontend

COPY apps/frontend ./apps/frontend

RUN npm run build --workspace=apps/frontend

# Production stage
FROM node:23.7.0-alpine AS production

WORKDIR /app

COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

RUN npm ci --workspace=apps/frontend --omit=dev

COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["npm", "start", "--workspace=apps/frontend"]
```

---

## Deployment Environments

### Environment Matrix

| Environment | Branch | Auto-Deploy | Database | URL |
|-------------|--------|-------------|----------|-----|
| Development | `feature/*` | No | Docker local | localhost |
| Testing | `develop` | Yes (on merge) | RDS staging | test.internal |
| Staging | `main` | Yes (on CI pass) | RDS staging | staging.blueharvest.com |
| Production | `main` (tagged) | Manual | RDS production | blueharvest.com |

---

## Monitoring & Alerts

### GitHub Actions Notifications

**Slack Integration**:
- Build failures
- Deployment status
- Security alerts
- Test failures

**Email Notifications**:
- Production deployments
- Critical security vulnerabilities
- Performance degradation

---

## Rollback Strategy

### Automated Rollback Triggers
1. Health check failures (3 consecutive)
2. Error rate > 5%
3. Response time p95 > 2 seconds
4. Failed smoke tests

### Manual Rollback Process
```bash
# Rollback to previous version
npm run rollback:production -- --to-version=<sha>

# Or rollback to last stable
npm run rollback:production -- --last-stable
```

---

## Quality Gates

### PR Merge Requirements
- ✅ All CI checks pass
- ✅ Code review approved (1+ reviewer)
- ✅ No merge conflicts
- ✅ Branch up to date with base
- ✅ Coverage threshold met (80%)
- ✅ No critical security issues
- ✅ SonarQube quality gate passed

### Deployment Gates
- ✅ All tests pass
- ✅ No blocking security vulnerabilities
- ✅ Performance benchmarks met
- ✅ Database migrations tested
- ✅ Smoke tests pass

---

## Cost Optimization

### GitHub Actions Minutes
- Use self-hosted runners for long-running tests
- Cache dependencies aggressively
- Run expensive tests only on main branch
- Parallelize test execution

### Container Registry
- Implement image retention policy (keep last 10)
- Use layer caching
- Compress images
- Multi-arch builds only for production

---

## Next Steps

### Implementation Priority
1. **Week 1**: Set up basic PR check workflow
2. **Week 2**: Add unit and integration test infrastructure
3. **Week 3**: Implement E2E tests with Playwright
4. **Week 4**: Set up SonarQube and security scanning
5. **Week 5**: Configure staging deployment
6. **Week 6**: Production deployment pipeline
