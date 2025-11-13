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

## Prerequisites

- **Node.js**: Version 23.7.0 or higher.
- **npm**: Version 11.2.0 (specified as the package manager).
- **Docker & Docker Compose**: For running the database and full stack.

## Quick Start with Docker Compose

The easiest way to run the entire application:

1. Clone the repository:

   ```bash
   git clone https://github.com/gelineau9/TheBlueHarvest.git
   cd TheBlueHarvest
   ```

2. Set up environment variables:
   - Copy `apps/backend/env.example` to `apps/backend/.env`
   - Copy `apps/frontend/env.example` to `apps/frontend/.env`

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

If you prefer to run components separately:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables in `apps/frontend/.env` and `apps/backend/.env`
   (see respective READMEs for details).

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

- Environment variables should be set in each app's directory (e.g., .env
  files). See `apps/backend/README.md` and `apps/frontend/README.md` for
  specifics.
- The .gitignore excludes common build artifacts, node modules, and environment
  files.
