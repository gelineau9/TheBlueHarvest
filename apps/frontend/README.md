This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# Blue Harvest

A hobby project built with a custom PERN stack (PostgreSQL, Express.js, React, Node.js). This README outlines the tech setup and hosting plan as of March 3, 2025.

## Tech Stack
- **Backend**: Node.js + Express
- **Frontend**: React + Next.js
- **Database**: PostgreSQL
- **Hosting**: AWS (EC2, RDS, S3), Nginx

---

## Project Overview

- **Goal**: Mirror core features (accounts, profiles, posts, media, comments) with a lean, custom solution.
- **Stack**: PERN (PostgreSQL, Express.js, React, Node.js) with Nginx as the web server.
- **Hosting**: AWS Free Tier (EC2 for compute, RDS for PostgreSQL, S3 for media), scaling to paid tiers as performance demands.
- **Status**: Early days. Database schema drafted, backend and frontend underway.
- **MVP Focus**: Leverage free tier as much as possible, scale up with traffic/donations.


---

## Next Steps

1. **Schema Validation**: Refine foreign keys and constraints with test data.
2. **Backend APIs**: Define endpoints (e.g., `/api/posts`, `/api/media`).
3. **Frontend**: Finalize wireframes and start React components.
4. **Hosting**: Confirm budget ($40/month operational cap) and set up AWS.
5. **MVP Launch**: Target mid-April 2025 with basic CRUD functionality.

---