# Production Dockerfile for NestJS
# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./src/database/schema.prisma

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy Prisma client and schema
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/src/database/schema.prisma ./src/database/schema.prisma

# Expose port
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["node", "dist/main.js"]

