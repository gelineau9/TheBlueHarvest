# The Brandy Hall Archives - Backend

This is the backend service for The Brandy Hall Archives project. It provides
REST APIs, auth, and handles business logic for the application. The project is
built with TypeScript and runs on Node.js. It is part of a Turborepo-managed
monorepo and is typically run alongside the frontend and database via Docker
Compose.

---

## Requirements

The project relies on the following dependencies:

- **Node.js**: JavaScript runtime environment. Targets v20+ (supports 24 LTS).
- **npm**: As specified in the root `package.json`.
- **Docker**: Recommended for local development.

---

### Tech Stack

- **Node.js + Express** — API server
- **TypeScript** — Static typing and build step
- **PostgreSQL** — Primary database
- **Slonik** — PostgreSQL client with type safety
- **Argon2** — Secure password hashing
- **jsonwebtoken (JWT)** — Authentication tokens
- **helmet** — HTTP security headers
- **express-rate-limit** — API rate limiting
- **express-validator** — Request validation
- **winston** — Structured logging

---

## Environment Variables

The backend does not load environment variables itself.

All configuration is provided externally via:

- Docker (`env_file`).
- The host shell (for non-Docker runs).
- Eventually CI environments.

### Required Variables

These variables are defined in the root `.env` file (see `env.example`):

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `BACKEND_PORT`
- `NODE_ENV`

The backend assumes these variables are present at startup.

---

## Development

Backend development is typically started from the **repository root** using
Turborepo:

```bash
npm run dev
```

This will start the backend along with the frontend and other services.

For database-only startup:

```bash
docker compose up postgres
```

## License

This project is (not currently but probably will be) licensed under the MIT
License.
