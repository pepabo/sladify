# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build TypeScript
RUN pnpm build

# Production stage - Use standard debian instead of alpine for glibc compatibility
FROM node:22-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy prisma schema
COPY prisma ./prisma

# Install prisma as a production dependency to generate client
RUN pnpm add prisma && pnpm prisma generate && pnpm remove prisma

# Copy built files
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p /data

# Set environment
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/sladify.db"

# Default command (can be overridden by fly.toml)
CMD ["node", "dist/index.js"]