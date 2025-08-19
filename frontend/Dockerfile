FROM node:20-alpine AS builder

WORKDIR /src

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
RUN npm ci  # Install ALL dependencies including devDependencies for build

# Copy the rest of the application
COPY . .

# Build the application for production
RUN npm run build

# Verify the build was successful
RUN ls -la .next/ && echo "✅ Build completed successfully"

# Development stage
FROM node:20-alpine AS dev

WORKDIR /src

# Install all dependencies for development
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Set environment variables for development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_BASE_URL=http://backend:5001

EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS runner

WORKDIR /src

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /src/.next ./.next
COPY --from=builder /src/public ./public
COPY --from=builder /src/next.config.ts ./

# Verify the production build is intact
RUN ls -la .next/ && echo "✅ Production build verified"

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_BASE_URL=http://backend:5001

EXPOSE 3000

# Start the production server
CMD ["npm", "start"]