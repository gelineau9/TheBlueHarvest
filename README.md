# The Blue Harvest

Welcome to The Blue Harvest project! This is a monorepo containing both the frontend and backend applications.

## Structure

- **Frontend**: A Next.js application located in `apps/frontend`.
- **Backend**: A TypeScript-based Node.js+Express service located in `apps/backend`.

This project uses [Turborepo](https://turbo.build) to manage multiple apps and packages efficiently.

## Prerequisites

- **Node.js**: Version 23.7.0 or higher.
- **npm**: Version 11.2.0 (specified as the package manager).

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/gelineau9/TheBlueHarvest.git
   cd TheBlueHarvest
   ```

2. Install dependencies (installs both frontend and backend via workspaces):

   ```bash
   npm install
   ```

3. Set up environment variables in `apps/frontend/.env` and `apps/backend/.env` (see respective READMEs for details).

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

- Environment variables should be set in each app's directory (e.g., .env files). See `apps/backend/README.md` and `apps/frontend/README.md` for specifics.
- The .gitignore excludes common build artifacts, node modules, and environment files.
