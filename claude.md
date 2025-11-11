# The Blue Harvest (Brandy Hall Archives) - Project Overview

## Project Purpose

**The Blue Harvest (BHA)** is a Lord of the Rings / Middle-earth themed role-playing community platform. It serves as a social hub for Middle-earth enthusiasts to create character profiles, share stories, organize events, and interact through posts and comments. The platform is designed specifically for LOTR RP communities, featuring themed events like the weekly "Prancing Pony" gatherings.

## Technology Stack

### Monorepo Architecture
- **Turborepo** - Monorepo build system
- **npm workspaces** - Multi-package management

### Backend
- **Node.js + TypeScript** - Runtime and language
- **Express.js** - Web framework
- **PostgreSQL 17** - Primary database
- **Slonik** - Type-safe PostgreSQL client
- **Argon2** - Secure password hashing
- **JWT (jsonwebtoken)** - Token-based authentication
- **Express Validator** - Input validation
- **Helmet** - Security headers
- **Winston** - Application logging
- **Express Rate Limit** - API rate limiting

### Frontend
- **Next.js 15.2.4** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon system
- **Zod** - Schema validation
- **shadcn/ui** - Pre-built accessible components

### Infrastructure
- **Docker + Docker Compose** - Containerization and orchestration
- **pgAdmin** - Database management UI
- **Nginx** - (Planned) Reverse proxy for production

### Deployment Target
- **AWS Free Tier** - EC2, RDS, S3
- **Budget Cap**: $40/month operational costs

## Project Structure

```
TheBlueHarvest/
├── apps/
│   ├── backend/              # Express.js API server
│   │   ├── src/
│   │   │   ├── config/       # Database configuration
│   │   │   ├── middleware/   # Authentication & error handling
│   │   │   ├── routes/       # API endpoints
│   │   │   └── utils/        # Logging utilities
│   │   └── tests/            # Backend tests
│   └── frontend/             # Next.js application
│       ├── src/
│       │   ├── app/          # App router pages & API routes
│       │   ├── components/   # Reusable UI components
│       │   ├── config/       # API configuration
│       │   ├── data/         # Static data
│       │   └── lib/          # Utility functions
│       └── public/           # Static assets
├── db/
│   ├── schema/              # Database schema definitions
│   └── seeds/               # Sample/seed data
└── docker-compose.yml       # Full stack orchestration
```

## Database Architecture

### Core Tables
- **accounts** - User authentication and account data
- **profiles** - Character/item/kinship/organization profiles
- **posts** - User-generated content (stories, art, recipes, events)
- **authors** - Profile-to-post relationships (multi-author support)
- **comments** - Post comments system
- **media** - File storage with table inheritance (post_media, profile_media, account_media)
- **relationships** - Profile connections with bidirectional/unidirectional support

### Type Tables
- profile_types (character, item, kinship, organization)
- user_roles (user, admin, moderator)
- post_types (story, art, recipe, event, other)
- bidirectional_relationship_types (friend, enemy, ally)
- unidirectional_relationship_types (parent, child, other)

### Advanced Features
- Table inheritance for media and relationships
- JSONB fields for flexible data storage
- Soft deletes (boolean flag)
- Automatic timestamps via triggers
- Custom ENUM types for relationships

## Implemented Features

### Authentication System
- User registration (email, username, password)
- JWT token-based authentication
- Login/logout functionality
- Profile management (update username, first name, last name)
- Auth state management with React Context
- HTTP-only cookie sessions via Next.js API routes

### Frontend Features
- Middle-earth themed UI (parchment/amber color scheme)
- Responsive design (mobile + desktop)
- Hero section with featured locations (Prancing Pony, Rivendell, Minas Tirith)
- Profile management interface
- Authentication dialogs (login/register)
- Event calendar sidebar
- Activity feed component
- Dark/light theme support

### API Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Get current user data
- `PUT /api/auth/profile` - Update user profile

## Development Status

### Completed
- Complete database schema with types, tables, indexes, triggers
- Full authentication system (signup, login, profile updates)
- Frontend UI with theming and responsive design
- Docker Compose development environment
- Basic CRUD operations for user accounts
- Profile management interface

### In Progress
- Type safety improvements (removing unsafe SQL queries in [auth.ts](apps/backend/src/routes/auth.ts))
- Character profile system
- Relationship management
- Post creation and viewing

### Planned Features
- Full CRUD for posts (stories, art, recipes, events)
- Character profile creation with relationships
- Media uploads to AWS S3
- Search functionality
- Event calendar with RSVP system
- Comments and interactions
- AWS deployment pipeline
- Swagger/OpenAPI documentation

## Development Setup

### Prerequisites
- Node.js >= 23.7.0
- npm 11.2.0
- Docker & Docker Compose

### Local Development Ports
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **Database**: localhost:5433
- **pgAdmin**: http://localhost:5050

### Environment Variables
Required configuration in `.env` files for both frontend and backend applications (see project documentation for specifics).

## Timeline & Milestones

- **MVP Target**: Mid-April 2025
- **Current Phase**: Early development - authentication complete
- **Recent Work**: Login frontend integration, profile updates, authentication flow refinement

## Project Metadata

- **Repository**: github.com/gelineau9/TheBlueHarvest
- **License**: MIT (planned)
- **Current Branch**: documentation
- **Main Branch**: main

## Development Philosophy

This is a hobby project building a custom PERN stack (PostgreSQL, Express, React, Node) social platform specifically tailored for Lord of the Rings role-playing communities. The emphasis is on:
- Lean, cost-effective infrastructure leveraging AWS Free Tier
- Type safety throughout the stack
- Accessible, themed UI design
- Community-focused features for RP engagement
