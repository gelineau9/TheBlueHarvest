# The Brandy Hall Archives

A full-stack social platform for collaborative creative writing, character profiles, and kinship/relationship tracking. Built as a Turborepo monorepo with a Next.js frontend, an Express backend, and PostgreSQL.

> **Live deployment**
> https://brandy-hall-archives-frontend.vercel.app 

---

## Table of Contents

- [Repository structure](#repository-structure)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local development — Docker Compose (recommended)](#local-development--docker-compose-recommended)
- [Local development — without Docker](#local-development--without-docker)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Running tests](#running-tests)
- [CI/CD](#cicd)
- [Deployment](#deployment)
- [Project scripts](#project-scripts)
- [Known limitations & roadmap](#roadmap)
- [Developer reference](./DEVELOPER_REFERENCE.md)

---

## Repository structure

```
TheBlueHarvest/
├── apps/
│   ├── backend/          # Express REST API (TypeScript)
│   └── frontend/         # Next.js 15 app (TypeScript, Tailwind CSS)
├── db/
│   ├── migrations/       # node-pg-migrate migration files
|   ├── seeds/            # table population data for local development
│   └── schema/           # Ordered SQL schema files (applied on first Docker init)
├── .github/workflows/    # GitHub Actions CI
├── docker-compose.yml    # Full local stack: postgres + backend + frontend + migrate
├── env.example           # Template for the root .env file
├── turbo.json            # Turborepo pipeline config
└── package.json          # Root workspace (npm workspaces + Turborepo)
```

### `apps/backend`

Express 5 API server. Handles authentication, profiles, posts, collections, comments, file uploads, kinship relationships, and the archive. Connects to PostgreSQL via the Slonik client. Uploads are served as static files from `uploads/` (local disk; S3 planned).

Rate limits: **20 requests / 15 min** on auth endpoints; **300 requests / 15 min** on all other endpoints.

Key directories:

```
src/
├── config/       # Database pool (Slonik + pg-driver), app config
├── middleware/   # JWT auth, error handling
├── routes/       # One file per site resource (auth, profiles, posts, collections, …)
└── utils/        # Logger (Winston), helpers
```

### `apps/frontend`

Next.js 15 app using the App Router. UI built with Tailwind CSS and shadcn/ui components (Radix UI primitives). Rich-text editing via Tiptap. Image cropping via react-image-crop. All backend communication is routed through Next.js API routes (server-to-server proxy); there are no direct client-to-backend fetches.

Key page routes:

| Route | Description |
|---|---|
| `/` | Home — writing and art carousels |
| `/archive` | Browse all published content |
| `/characters` | A–Z character browser with pagination (48 per page) |
| `/events` | Event calendar and upcoming events feed |
| `/profiles/[id]` | Public profile (character, kinship, etc.) |
| `/profiles/[id]/gallery` | Art posts for a profile |
| `/profiles/[id]/writing` | Writing posts for a profile |
| `/profiles/[id]/items` | Item sub-profiles for a character |
| `/profiles/create` | Create a new profile |
| `/posts/[id]` | Post detail with comments |
| `/posts/create` | Create a new post |
| `/collections/[id]` | Collection detail |
| `/collections/create` | Create a new collection |
| `/register` | User registration |
| `/account` | Account settings |
| `/my/*` | Dashboard — own profiles, posts, collections |

---

## Tech stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo 2, npm workspaces |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Frontend UI | Tailwind CSS 4, shadcn/ui, Radix UI |
| Frontend editor | Tiptap 3 |
| Backend | Express 5, TypeScript |
| Database client | Slonik 48 + @slonik/pg-driver |
| Database | PostgreSQL 17 |
| Migrations | node-pg-migrate |
| Auth | JWT (jsonwebtoken), Argon2 password hashing |
| File uploads | Multer 2, Sharp (image processing) |
| Security | Helmet, express-rate-limit, express-validator |
| Logging | Winston |
| Testing | Vitest (unit, integration), Cypress (E2E) |
| CI | GitHub Actions |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Database hosting | Supabase (PostgreSQL) |

---

## Prerequisites

- **Node.js** ≥ 24.12.0 (see `engines` in `package.json`)
- **npm** 11.7.0 (`packageManager` field is enforced)
- **Docker & Docker Compose** — required for the full local stack
- **psql** — optional, for running seeds or inspecting the database directly

---

## Local development — Docker Compose (recommended)

This brings up the postgre db, the backend, and the frontend in one command.

### 1. Clone and install

```bash
git clone https://github.com/gelineau9/TheBlueHarvest.git
cd TheBlueHarvest
npm install
```

### 2. Configure environment

```bash
cp env.example .env
```

Open `.env` and fill in real values. At a minimum:

- Generate a strong `JWT_SECRET`:
  ```bash
  openssl rand -base64 48
  ```
- The default database credentials (`merry` / `secondbreakfast` / `bha_db`) work with the Docker Compose Postgres service. Change them if you prefer.

### 3. Start the stack

```bash
docker compose up --build
```

Services:

| Container | Host port | Description |
|---|---|---|
| `bha-pg` | `localhost:5433` | PostgreSQL 17 |
| `bha-backend` | `localhost:4000` | Express API |
| `bha-frontend` | `localhost:3000` | Next.js |

The schema files in `db/schema/` are applied automatically on the **first** Postgres
container start (empty `postgres_data` volume). On subsequent starts the volume
is reused and the schema is not reapplied.

### 4. Verify

- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/health → `{"status":"ok","uptime":…}`

### 5. Running migrations (existing database)

For schema changes on a live database, use the one-shot migrate service:

```bash
docker compose run --rm migrate
```

After a fresh init, mark the baseline migration as already run so the runner
doesn't try to reapply it:

```bash
docker compose run --rm migrate mark-as-run 0001
```

### 6. Stopping and cleanup

```bash
# Stop without losing data
docker compose down

# Full reset — destroys postgres_data and uploads_data volumes
docker compose down -v
```

---

## Local development — without Docker

Useful if you want faster feedback cycles and already have a Postgres instance
running locally or want to point at Supabase directly.

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp env.example .env
```

Edit `.env` so that `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
point to your Postgres instance, and set `DATABASE_URL` accordingly.

Also update `BACKEND_INTERNAL_URL=http://localhost:4000` and
`NEXT_PUBLIC_BACKEND_HOSTNAME=localhost`.

### 3. Apply schema

If using a fresh local database, apply schema files in order:

```bash
for file in db/schema/*.sql; do
  psql -h localhost -U <user> -d <db> -f "$file"
done
```

### 4. Run dev servers

```bash
# From the repo root — starts both apps in parallel via Turborepo
npm run dev
```

Or run apps individually:

```bash
# Backend only (loads .env from repo root automatically)
npm run dev --workspace=apps/backend

# Frontend only
npm run dev --workspace=apps/frontend
```

---

## Environment variables

All configuration lives in a **single root `.env` file** (never committed).
See `env.example` for a fully annotated template.

### Database

| Variable | Example | Description |
|---|---|---|
| `POSTGRES_USER` | `merry` | User created by the Postgres Docker image on first init |
| `POSTGRES_PASSWORD` | `secondbreakfast` | Password for above user |
| `POSTGRES_DB` | `bha_db` | Database created on first init |
| `DB_HOST` | `postgres` (Docker) / `localhost` (bare) | Postgres host for the backend |
| `DB_PORT` | `5432` | Postgres port (internal Docker network uses 5432; host uses 5433) |
| `DB_USER` | `merry` | Must match `POSTGRES_USER` |
| `DB_PASSWORD` | `secondbreakfast` | Must match `POSTGRES_PASSWORD` |
| `DB_NAME` | `bha_db` | Must match `POSTGRES_DB` |
| `DATABASE_URL` | `postgres://merry:…@localhost:5433/bha_db` | Full connection URL for migrations |

### Auth & backend

| Variable | Example | Description |
|---|---|---|
| `JWT_SECRET` | *(64-char random string)* | **Required.** Minimum 32 characters. Generate with `openssl rand -base64 48` |
| `BACKEND_PORT` | `4000` | Port the Express server binds to |
| `BACKEND_URL` | `http://localhost:4000` | Public-facing base URL for uploaded file URLs in API responses |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of CORS-allowed origins |

### Frontend

| Variable | Example | Description |
|---|---|---|
| `BACKEND_INTERNAL_URL` | `http://backend:4000` | URL the Next.js server uses to reach the backend (server-to-server). Use `http://backend:4000` inside Docker, `http://localhost:4000` for bare dev |
| `NEXT_PUBLIC_BACKEND_HOSTNAME` | `localhost` | Backend hostname baked into the JS bundle at build time (no protocol). Used to whitelist the image remote pattern in `next.config.ts` |
| `NODE_ENV` | `development` | Runtime environment |

> **Production note:** `NEXT_PUBLIC_*` variables are baked into the Next.js bundle
> at **build time**. They must be set as build arguments (`--build-arg`) in Docker
> or as environment variables in your hosting platform before the build runs.

---

## Database

### Schema

The database schema is defined as ordered SQL files in `db/schema/`:

| File | Contents |
|---|---|
| `001_create_types.sql` | Custom enum types |
| `002_create_tables.sql` | Core tables (accounts, profiles, posts, collections, …) |
| `003_create_junction_tables.sql` | Many-to-many join tables |
| `004_create_indexes.sql` | Indexes |
| `005_create_triggers.sql` | Triggers (e.g. `updated_at` timestamps) |
| `006_create_constraints.sql` | Additional constraints |
| `007_alter_comments_table.sql` | Comment threading changes |
| `008_add_is_published.sql` | Published flag on posts and profiles |
| `009_add_account_details.sql` | Extended account fields |
| `010_create_featured_profiles.sql` | Featured profiles system |
| `011_add_relationship_label.sql` | Relationship label field |
| `012_kinship_members_and_rel_types.sql` | Kinship group members and relationship types |

When using Docker Compose, these files are mounted into the Postgres container's
`/docker-entrypoint-initdb.d/` directory and applied automatically on first start.

### Migrations

For incremental schema changes on an existing database, migration files live in
`db/migrations/` and are managed by **node-pg-migrate**.

Run pending migrations:

```bash
# Inside Docker
docker compose run --rm migrate

# Bare metal (from apps/backend workspace)
npm run migrate --workspace=apps/backend
```

Migration state is tracked in the `schema_migrations` table.

### Core data model

**Profile types** (`profile_type_id`):

| ID | Type | Notes |
|---|---|---|
| 1 | Character | Top-level; globally unique name |
| 2 | Item | Requires a character parent |
| 3 | Kinship | Requires a character parent; has member list |
| 4 | Organization | Requires a character parent |
| 5 | Location | Top-level; unique name per account |

**Post types** (`post_type_id`):

| ID | Type | Content fields |
|---|---|---|
| 1 | Writing | `body` (rich text) |
| 2 | Art | `images[]`, `description` |
| 3 | Media | `images[]`, `description` |
| 4 | Event | `eventDateTime`, `location`, `description`, `headerImage` |

**Collection types** (`collection_type_id`):

| ID | Type | Accepted post types |
|---|---|---|
| 1 | Collection | Any |
| 2 | Chronicle | Writing only |
| 3 | Album | Media only |
| 4 | Gallery | Art only |
| 5 | Event Series | Events only |

---

## Running tests

```bash
# All tests (Turborepo runs backend + frontend in parallel)
npm run test

# Backend tests with coverage
cd apps/backend && npx vitest run --coverage

# Frontend tests with coverage
cd apps/frontend && npx vitest run --coverage

# Frontend E2E (Cypress)
npm run cypress:open --workspace=apps/frontend   # interactive
npm run cypress:run  --workspace=apps/frontend   # headless
```

Backend tests require a running Postgres instance. The CI workflow spins one up
automatically; for local use, `docker compose up postgres` is the fastest option.

---

## CI/CD

Two GitHub Actions workflows run on every pull request and push to `main`:

### `.github/workflows/ci.yml`

| Job | What it does |
|---|---|
| `typecheck-and-build` | `tsc --noEmit` across all packages, then builds both apps |
| `test-backend` | Spins up Postgres 16, runs Vitest with coverage, uploads report |
| `test-frontend` | Runs Vitest with coverage, uploads report |

### `.github/workflows/lint-and-format.yml`

Runs ESLint and Prettier checks across the monorepo.

### Deployment

- **Frontend (Vercel):** Auto-deploys on push to the tracked branch. `NEXT_PUBLIC_BACKEND_HOSTNAME` must be set in the Vercel project environment.
- **Backend (Render):** Auto-deploys on push. All `DB_*`, `JWT_SECRET`, `BACKEND_URL`, and `ALLOWED_ORIGINS` variables must be set in the Render service environment.

---

## Deployment

### Vercel (frontend)

The Next.js app is deployed to Vercel with `output: 'standalone'` configured in
`next.config.ts`.

Required Vercel environment variables:

- `NEXT_PUBLIC_BACKEND_HOSTNAME` — hostname of the backend (no protocol)
- `BACKEND_INTERNAL_URL` — full URL the server-side Next.js code uses to reach the backend

### Render (backend)

The Express server is deployed as a Node.js service on Render.

**Important:** `@types/express` and `@types/multer` are in `dependencies` (not
`devDependencies`) because Render runs `npm ci --omit=dev` by default, and these
packages are needed at build time for the TypeScript compilation step.

Required Render environment variables: all variables listed in the
[Auth & backend](#auth--backend) and [Database](#database) sections above.

### Supabase (database)

The production database is hosted on Supabase using the **session-mode pooler**:

- Host: `aws-0-us-east-1.pooler.supabase.com`
- Port: `5432`
- User: `postgres.<project-ref>`

The backend connects with `sslmode=no-verify` (configured in `apps/backend/src/config/database.ts`) to satisfy Supabase's SSL requirement without a CA certificate.

## Project scripts

Run from the **repository root**:

| Script | Description |
|---|---|
| `npm run dev` | Start all apps in development mode with live reload |
| `npm run build` | Build all apps (backend: `tsc`, frontend: `next build`) |
| `npm run start` | Start built apps (requires `build` first) |
| `npm run check-types` | TypeScript type-check across all packages |
| `npm run lint` | ESLint across all packages |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier check |
| `npm run format:fix` | Prettier write |
| `npm run test` | Run all tests |
| `npm run clean` | Remove build artifacts, Turbo cache, and node_modules |
| `npm run clean:docker` | Remove Docker containers, volumes, and builder cache |

---

## Active Development

| Area | Notes |
|---|---|
| File uploads | Uploaded files are stored in `apps/backend/uploads/`. This volume is not persistent on Render between deploys. Migration to S3 (or compatible object storage) is planned. Avatar uploads are already processed by Sharp (resized to 400×400, converted to WebP); general image uploads are stored unprocessed. |
| Image optimisation | `unoptimized: true` is set in `next.config.ts`. Will be re-enabled once uploads are behind a CDN. |
| E2E test coverage | Cypress test coverage is WIP. |
| Collection post ordering | Posts within a collection can be manually reordered (`PUT /:collectionId/posts/reorder`) — frontend reorder UI is planned. |
| Future Features | Robust front-end changes are planned, with additional homepage content and data feeds. |

---

## License

MIT License — see [LICENSE](./LICENSE) for details.
