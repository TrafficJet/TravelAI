# ─────────────────────────────────────────────
# Stage 1: builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Cache-bust arg — increment when you need a forced rebuild
ARG CACHE_BUST=20260518

# Required for bcrypt native bindings + openssl for Prisma
RUN apk add --no-cache python3 make g++ openssl openssl-dev

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json ./

# Install all deps (including devDependencies needed for tsc + prisma generate)
RUN npm ci

# Copy Prisma schema so we can generate the client
COPY prisma ./prisma

# Generate Prisma client into node_modules
RUN npx prisma generate

# Copy the rest of the source
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript → dist/
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: runner
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

# Required for bcrypt native bindings + openssl for Prisma
RUN apk add --no-cache python3 make g++ openssl openssl-dev

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifests and install production-only deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma schema + migrations (needed for `prisma migrate deploy`)
COPY prisma ./prisma

# Generate Prisma client (as root, before user switch)
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy startup script and make it executable (while still root)
COPY start.sh ./start.sh
RUN chmod +x /app/start.sh

# Create non-root user and fix ownership
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# Use exec form so signals are delivered directly to node (no sh wrapper PID 1)
CMD ["/app/start.sh"]
