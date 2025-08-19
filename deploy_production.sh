#!/bin/bash

# Production Deployment Script for Brain Visualizer
# Run this on your DigitalOcean droplet

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Load production environment variables
if [ -f "env.production" ]; then
    echo "📋 Loading production environment variables..."
    export $(cat env.production | grep -v '^#' | xargs)
else
    echo "❌ Error: env.production file not found"
    exit 1
fi

# Check required environment variables
if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "your-super-secret-production-key-change-this-immediately" ]; then
    echo "❌ Error: Please set a proper SECRET_KEY in env.production"
    exit 1
fi

# Stop existing services
echo "🛑 Stopping existing services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml down || true

# Clean up old images (optional, uncomment if you want to save disk space)
# echo "🧹 Cleaning up old images..."
# docker image prune -f

# Pull latest images and build
echo "🔨 Building and starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Check if services are running
if docker compose -f docker-compose.yml -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Services are running successfully!"
    echo "🌐 Frontend should be available at: http://your-droplet-ip:3000"
    echo "🔧 Backend should be available at: http://your-droplet-ip:5001"
else
    echo "❌ Some services failed to start. Check logs with:"
    echo "   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs"
    exit 1
fi

echo "🎉 Production deployment completed!"
