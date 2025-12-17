# The Blue Harvest

Welcome to The Blue Harvest project! This is a monorepo containing both the
frontend and backend applications with a complete authentication system.

## Structure

- **Frontend**: A Next.js application located in `apps/frontend`.
- **Backend**: A TypeScript-based Node.js+Express service located in
  `apps/backend`.
- **Database**: PostgreSQL database with Docker Compose setup.

This project uses [Turborepo](https://turbo.build) to manage multiple apps and
packages efficiently.

---

## Prerequisites

- **Node.js**: Version 20 LTS or newer (Node 24 LTS supported).
- **npm**: Version 11.7.0 (specified as the package manager).
- **Docker & Docker Compose**: For running the database and full stack.

---

## Environment Variables

The project uses a single root `.env` file as the source for runtime
configuration. Environment variables are not loaded by application code, but
provided externally by:

- Docker (`env_file`)
- The host shell (for non-Docker runs)
- Eventually CI environments

### Notes

- Secrets (database credentials, JWT secret) live only in the root `.env` file.
- The frontend does not have access to backend secrets

## Quick Start with Docker Compose

The easiest way to run the entire application:

1. Clone the repository:

   ```bash
   git clone https://github.com/gelineau9/TheBlueHarvest.git
   cd TheBlueHarvest
   ```

2. Create the environment file(s):
   ```bash
   cp env.example .env
   ```
3. Start the entire stack:

   ```bash
   docker-compose up
   ```

   This will start:
   - PostgreSQL database on port 5433
   - Backend API on port 4000
   - Frontend on port 3000

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

## Manual Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Ensure environment variables are set in your shell (see `env.example` for
   reference)

3. Start the database:

   ```bash
   docker-compose up postgres
   ```

4. Run the development environment:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run build`: Builds all apps and packages.
- `npm run dev`: Runs all apps in development mode with live reloading.
- `npm run lint`: Lints all apps and packages.
- `npm run start`: Starts the built apps (requires build first).

## Configuration

- Backend and infrastructure environment variables are defined at the repo root.
  Frontend public configuration is defined in `apps/frontend/.env`
- Applications assume environment variables are already present at runtime.
- The .gitignore excludes common build artifacts, node modules, and environment
  files.
