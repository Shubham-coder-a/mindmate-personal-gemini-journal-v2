# Production Dockerfile for MindMate on Google Cloud Run
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Vite frontend and esbuild server.ts into dist/
ENV NODE_ENV=production
RUN npm run build

# Production Runner stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Cloud Run defaults to non-root
USER node

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
