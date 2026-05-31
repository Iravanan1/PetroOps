# ==========================================================
# STAGE 1: BUILD ENVIRONMENT
# ==========================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy project files
COPY . .

# Compile Vite static front-end assets & Node authority server
RUN npm run build

# ==========================================================
# STAGE 2: PRODUCTION ENVIRONMENT RUNTIME
# ==========================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only for lightweight image weight
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and server bundles from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/public ./public

# Expose production port
EXPOSE 8080

# Configure secure non-root execution user context
USER node

# Start authority backend gatekeeper
CMD ["node", "dist/server/server.js"]
