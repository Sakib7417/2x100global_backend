# Production-ready multi-stage build for 2x100 Global Backend
FROM node:20-alpine AS base

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate && npm run build

# Remove dev dependencies after build
RUN npm prune --production

# ------------------------------------------------------------------------------
# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

# Create logs directory
RUN mkdir -p logs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => { if (r.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist/index.js"]
