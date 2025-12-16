# Brandy Hall Archives - Frontend

This is the frontend application for the Brandy Hall Archives project, built
with [Next.js](https://nextjs.org).

The frontend is part of a Turborepo-managed monorepo and is not intended to be
run in isolation.

## Development

Frontend development is typically started from the repo root using Turbo:

```bash
npm run dev
```

This will start the Next.js development server along with the backend and other
services. Once running, the frontend is available at:

- [http://localhost:3000](http://localhost:3000)

## Environment Variables

The frontend does not load environment variables in browser code. Backend
communication happens in Next.js server actions and router handlers, which run
on the server and may access server-side environment variables. The backend base
URL is provided via the root `.env` file and is no exposed to the browser.

---

## Project Structure

- `src/app/` - App Router routes, layouts and pages.
- `src/app/api/` - Next.js API routes.
- `src/components/` - UI and feature components.
- `src/config/` - Frontend config.
- `src/data/` - Static/mock data used by the UI.
- `public/` - Static assets.

---
