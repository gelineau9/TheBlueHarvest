# ============================================================
# Stage 1: Install all dependencies (including dev) for build
# ============================================================
FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/

RUN npm ci

# ============================================================
# Stage 2: Build Next.js application
# ============================================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package.json package-lock.json ./
COPY turbo.json ./
COPY apps/frontend ./apps/frontend

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time.
# Pass via --build-arg in docker-compose or the CLI.
ARG NEXT_PUBLIC_BACKEND_HOSTNAME
ENV NEXT_PUBLIC_BACKEND_HOSTNAME=${NEXT_PUBLIC_BACKEND_HOSTNAME}

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/frontend

RUN npm run build

# ============================================================
# Stage 3: Lean production runtime using Next.js standalone output
# ============================================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy static public assets
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Copy standalone bundle (server.js + minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./

# Copy pre-rendered static files into the standalone tree
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# next build --standalone generates apps/frontend/server.js relative to the monorepo root
CMD ["node", "apps/frontend/server.js"]
