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