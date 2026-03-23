# ============================================================
# Stage 1: Install all dependencies (including dev) for build
# ============================================================
FROM node:24-alpine AS deps

WORKDIR /app

# Copy workspace manifests only — maximise layer cache hit
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/

RUN npm ci

# ============================================================
# Stage 2: Compile TypeScript
# ============================================================
FROM node:24-alpine AS builder

WORKDIR /app

# Bring in the full node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules 2>/dev/null || true

# Copy workspace manifests and source
COPY package.json package-lock.json ./
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# Compile TypeScript → dist/
RUN npm run build

# ============================================================
# Stage 3: Lean production runtime — no devDependencies
# ============================================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 backend

# Copy workspace manifests and install production deps only
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/

RUN npm ci --omit=dev

# Copy compiled output from builder stage
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Create uploads directories with correct ownership
# (these will be overlaid by the named Docker volume at runtime)
RUN mkdir -p /app/apps/backend/uploads/images \
              /app/apps/backend/uploads/avatars \
 && chown -R backend:nodejs /app/apps/backend/uploads

USER backend

WORKDIR /app/apps/backend

EXPOSE 4000

CMD ["node", "dist/index.js"]
