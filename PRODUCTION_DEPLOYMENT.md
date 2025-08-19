# Production Deployment Guide

This guide walks you through deploying the Brain Visualizer application to production on DigitalOcean.

## Prerequisites

- DigitalOcean droplet with Docker and Docker Compose installed
- Domain name (optional, for SSL)
- GitHub repository with proper secrets configured

## GitHub Secrets Setup

You need to add these secrets to your GitHub repository:

1. **DO_SSH_PRIVATE_KEY**: Your SSH private key for accessing the droplet
2. **DO_DEPLOY_HOST**: Your droplet's IP address
3. **DO_DEPLOY_PATH**: Path on the droplet where the app will be deployed (e.g., `/root/brain-visualizer`)
4. **PROD_SECRET_KEY**: A strong, unique secret key for Flask sessions
5. **PROD_DATABASE_URL**: Your production database connection string

## Production Environment Variables

Create an `env.production` file on your droplet with these variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://myuser:mypassword@db:5432/brain_prod

# Filestore Configuration
FILESTORE_PATH=/app/filestore

# Flask Secret Key (CHANGE THIS!)
SECRET_KEY=your-super-secret-production-key-change-this-immediately

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Application Settings
FLASK_ENV=production
NODE_ENV=production

# Security Headers
SECURE_HEADERS=True
```

## Deployment Steps

### 1. Initial Setup on Droplet

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Create deployment directory
mkdir -p /root/brain-visualizer
cd /root/brain-visualizer

# Clone your repository (first time only)
git clone https://github.com/yourusername/brain-visualizer.git .

# Create production environment file
cp env.example env.production
# Edit env.production with your production values
nano env.production
```

### 2. Configure Production Settings

- **SECRET_KEY**: Generate a strong random key (you can use `openssl rand -hex 32`)
- **DATABASE_URL**: Use your production database credentials
- **FILESTORE_PATH**: Set to your mounted NIfTI storage path

### 3. Deploy via GitHub Actions

Push to your `main` branch to trigger automatic deployment:

```bash
git add .
git commit -m "Update production configuration"
git push origin main
```

The GitHub Actions workflow will:
1. Sync your code to the droplet
2. Set production environment variables
3. Run the production deployment script
4. Verify the deployment

### 4. Manual Deployment (if needed)

If you need to deploy manually:

```bash
# On your droplet
cd /root/brain-visualizer
chmod +x deploy_production.sh
./deploy_production.sh
```

## Production Features

### Backend
- ✅ Gunicorn WSGI server (production-grade)
- ✅ Multiple worker processes
- ✅ User-specific filter storage
- ✅ Proper session management
- ✅ Production environment variables

### Frontend
- ✅ Production build optimization
- ✅ Static file serving
- ✅ Environment-specific configuration
- ✅ Production dependencies only

### Infrastructure
- ✅ Docker Compose with production overrides
- ✅ Health checks and restart policies
- ✅ Volume persistence
- ✅ Network isolation

## Monitoring and Maintenance

### Check Service Status
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### View Logs
```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend
```

### Restart Services
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Redeploy
./deploy_production.sh
```

## Security Considerations

1. **Change the default SECRET_KEY** immediately
2. **Use strong database passwords**
3. **Consider adding a reverse proxy** (Nginx) for SSL termination
4. **Set up firewall rules** to limit access
5. **Regular security updates** for your droplet

## Troubleshooting

### Common Issues

1. **Services not starting**: Check logs with `docker compose logs`
2. **Permission errors**: Ensure `deploy_production.sh` is executable
3. **Environment variables**: Verify `env.production` is properly formatted
4. **Port conflicts**: Ensure ports 3000 and 5001 are available

### Debug Mode

To debug issues, you can temporarily switch to development mode:

```bash
# Comment out production overrides
docker compose up -d --build
```

## Next Steps

1. **Set up SSL/TLS** with Let's Encrypt and Nginx
2. **Configure monitoring** (e.g., Prometheus, Grafana)
3. **Set up backups** for your database and filestore
4. **Implement CI/CD** with staging environments
5. **Add health check endpoints** for monitoring

## Support

If you encounter issues:
1. Check the logs: `docker compose logs`
2. Verify environment variables
3. Ensure all secrets are properly configured in GitHub
4. Check Docker and Docker Compose versions on your droplet
