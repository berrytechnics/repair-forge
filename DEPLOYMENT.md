# RepairTix Deployment Guide

This guide provides step-by-step instructions for deploying RepairTix to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Hetzner Cloud Deployment](#hetzner-cloud-deployment)
- [Environment Variables](#environment-variables-reference)
- [Database Setup](#database-setup)
- [Post-Deployment Steps](#post-deployment-steps)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- A GitHub repository with RepairTix code
- Access to a deployment platform (Hetzner Cloud, AWS, Google Cloud, etc.)
- PostgreSQL 15+ database (managed or self-hosted)
- Domain name (optional, for custom domains)
- SSL certificate (for HTTPS)

## Deployment Options

### Recommended: Hetzner Cloud

Hetzner Cloud is recommended for cost-effective VPS deployments with full control. See [Hetzner Cloud Deployment](#hetzner-cloud-deployment) for detailed instructions.

### Alternative Platforms

RepairTix can be deployed to:
- **Hetzner Cloud** (VPS with Docker Compose) - See [Hetzner Cloud Deployment](#hetzner-cloud-deployment)
- **AWS** (ECS, EC2, Elastic Beanstalk)
- **Google Cloud Platform** (Cloud Run, Compute Engine)
- **Azure** (App Service, Container Instances)
- **DigitalOcean** (App Platform, Droplets)
- **Heroku** (with modifications)

## Hetzner Cloud Deployment

Deploy Circuit Sage to a Hetzner Cloud VPS with Docker Compose, Nginx reverse proxy, and SSL certificates.

### Prerequisites

- Hetzner Cloud server (Ubuntu 24.04 recommended)
- Domain name pointing to your server's IP address
- SSH access to your server

### Quick Start

#### 1. Initial Server Setup

SSH into your Hetzner server and run the setup script:

```bash
# Clone repository
git clone https://github.com/your-repo/circuit-sage.git
cd circuit-sage

# Run setup script (requires sudo)
sudo bash deployment/hetzner/setup-server.sh
```

This installs Docker, Docker Compose, Nginx, Certbot, and configures the firewall.

#### 2. Configure Environment Variables

```bash
# Copy example file
cp deployment/hetzner/env.production.example .env.production

# Edit with your values
nano .env.production
```

**Required variables:**
- `DOMAIN_NAME` - Your domain name
- `POSTGRES_PASSWORD` - Strong database password
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `ENCRYPTION_KEY` - Generate with: `openssl rand -hex 16`
- `ALLOWED_ORIGINS` - Your domain(s) for CORS
- `NEXT_PUBLIC_API_URL` - Your API URL (e.g., `https://yourdomain.com/api`)

#### 3. Deploy Application

```bash
# Make deploy script executable
chmod +x deployment/hetzner/deploy.sh

# Run deployment
./deployment/hetzner/deploy.sh
```

The deployment script will:
- Build Docker images
- Start all services (database, backend, frontend)
- Configure Nginx reverse proxy
- Set up SSL certificate with Let's Encrypt
- Configure automatic SSL renewal

### Architecture

```
Internet → Nginx (Ports 80/443)
  ├── Frontend Container (Port 3000) → /
  └── Backend Container (Port 4000) → /api
        ↓
    PostgreSQL Container (Port 5432, internal only)
```

### DNS Configuration

Before deployment, configure your domain DNS:

1. **A Record**: Point your domain to your Hetzner server IP
   ```
   yourdomain.com → YOUR_SERVER_IP
   ```

2. **Optional - WWW subdomain**:
   ```
   www.yourdomain.com → YOUR_SERVER_IP
   ```

### Managing Services

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Update application
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Post-Deployment

1. **Verify Deployment**:
   - Frontend: `https://yourdomain.com`
   - Backend API: `https://yourdomain.com/api/health`

2. **Remove Default Credentials**:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend yarn ts-node scripts/remove-default-admin.ts
   ```

3. **Create Production Admin**: Register a new company via `/api/auth/register`

### Troubleshooting

See [deployment/hetzner/README.md](./deployment/hetzner/README.md) for detailed troubleshooting guide.

Common issues:
- **Services won't start**: Check logs with `docker compose -f docker-compose.prod.yml logs`
- **SSL certificate issues**: Ensure DNS is configured correctly before running deployment
- **Nginx errors**: Check configuration with `sudo nginx -t`

## Environment Variables Reference

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Server port | `4000` |
| `DB_HOST` | Yes | Database host | `localhost` or database server IP |
| `DB_PORT` | Yes | Database port | `5432` |
| `DB_USER` | Yes | Database username | `circuit_sage_user` |
| `DB_PASSWORD` | Yes | Database password | (auto-generated) |
| `DB_NAME` | Yes | Database name | `circuit_sage_db` |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) | (generate with openssl) |
| `ENCRYPTION_KEY` | Yes | Encryption key (32 chars) | (generate with openssl) |
| `ALLOWED_ORIGINS` | Recommended | CORS allowed origins | `https://yourdomain.com` |
| `IS_DOCKER` | Yes | Docker environment flag | `true` |
| `SENTRY_DSN` | Optional | Sentry DSN for error tracking | `https://...@o4510454298902528.ingest.us.sentry.io/...` |

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL | `https://api.yourdomain.com/api` |
| `NEXT_TELEMETRY_DISABLED` | Optional | Disable Next.js telemetry | `1` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry DSN for client-side error tracking | `https://...@o4510454298902528.ingest.us.sentry.io/...` |
| `SENTRY_DSN` | Optional | Sentry DSN for server-side error tracking | `https://...@o4510454298902528.ingest.us.sentry.io/...` |

### Generating Secrets

**JWT Secret** (minimum 32 characters):
```bash
openssl rand -base64 32
```

**Encryption Key** (exactly 32 characters for AES-256-GCM):
```bash
openssl rand -hex 16
```

## Database Setup

### Using Docker Compose (Recommended)

When using Docker Compose (e.g., Hetzner deployment), PostgreSQL is automatically configured:

1. Database runs in a Docker container
2. Connection details are configured via environment variables
3. Migrations run automatically on backend startup

### Using External PostgreSQL

If using an external database:

1. Create PostgreSQL 15+ database
2. Enable UUID extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. Update backend environment variables with connection details
4. Run migrations manually or let startup script handle it

### Database Migrations

Migrations run automatically on backend startup. The startup script (`backend/scripts/start.sh`) will:

1. Check database connection
2. Run all migrations in `database/migrations/` directory
3. Log migration results

To run migrations manually:

```bash
cd backend
yarn migrate:prod
```

## Post-Deployment Steps

### 1. Remove Default Credentials

**CRITICAL**: Remove default admin credentials before production use:

```bash
# Option 1: Use the removal script (if you have access to backend)
yarn ts-node backend/scripts/remove-default-admin.ts

# Option 2: Manually update via API or database
# Change password for admin@repairtix.com or admin@repairmanager.com
```

See [SECURITY.md](./docs/SECURITY.md) for more details.

### 2. Create Production Admin User

1. Register a new company via `/api/auth/register`
2. First user automatically becomes admin
3. Delete or update default admin credentials

### 3. Configure Custom Domain (Optional)

For Hetzner deployments, custom domain configuration is handled automatically by the deployment script. See [Hetzner Cloud Deployment](#hetzner-cloud-deployment) for details.

For other platforms:
1. Configure DNS records to point to your server
2. Set up SSL certificate (Let's Encrypt recommended)
3. Update environment variables with your domain

### 4. Set Up Monitoring

- Monitor application logs: `docker compose -f docker-compose.prod.yml logs -f`
- Set up health check alerts
- Configure error tracking (see Monitoring section)

### 5. Configure Backups

- Set up automated database backups (see Database Backups documentation)
- Document restore procedures
- Test backup restoration regularly

## Troubleshooting

### Backend Won't Start

**Check logs for:**
- Database connection errors
- Missing environment variables
- Migration failures

**Common fixes:**
```bash
# Verify environment variables are set
# Check database is accessible
# Review migration logs
```

### Frontend Build Fails

**Common issues:**
- `NEXT_PUBLIC_API_URL` not set
- Build timeout (increase Docker build resources)
- Memory limits (increase Docker memory allocation)

**Fix:**
```bash
# Ensure NEXT_PUBLIC_API_URL is set before build
# Check Docker build logs: docker compose -f docker-compose.prod.yml build --no-cache frontend
```

### Database Connection Errors

**Symptoms:**
- "Unable to connect to the database"
- Connection timeout errors

**Fixes:**
1. Verify database credentials in environment variables
2. Check database is running and accessible
3. Verify network connectivity (firewall rules)
4. For Docker Compose: Ensure containers are on the same network

### Migrations Fail

**Symptoms:**
- "Migration failed" in logs
- Database schema errors

**Fixes:**
1. Check migration files are present in container
2. Verify database has UUID extension enabled
3. Review migration logs for specific SQL errors
4. Run migrations manually if needed

### CORS Errors

**Symptoms:**
- Frontend can't connect to API
- CORS policy errors in browser console

**Fixes:**
1. Set `ALLOWED_ORIGINS` environment variable
2. Include frontend URL in `ALLOWED_ORIGINS` (comma-separated)
3. Restart backend service after updating

### Health Check Fails

**Check:**
1. Backend service is running
2. `/health` endpoint is accessible
3. No errors in backend logs

**Test:**
```bash
# For Docker Compose deployments
curl http://localhost:4000/health

# For production deployments
curl https://yourdomain.com/api/health
```

## Rollback Procedure

If deployment fails:

1. **Docker Compose**: Stop containers and revert to previous version
   ```bash
   docker compose -f docker-compose.prod.yml down
   git checkout <previous-commit>
   docker compose -f docker-compose.prod.yml up -d --build
   ```
2. **Database**: Restore from backup if migrations caused issues
3. **Environment**: Revert environment variable changes

## Monitoring & Maintenance

### Application Monitoring

- **Logs**: Monitor Docker logs: `docker compose -f docker-compose.prod.yml logs -f`
- **Health Checks**: Set up automated health check monitoring
- **Error Tracking**: Integrate Sentry or similar (see Monitoring section)

### Database Maintenance

- **Backups**: Verify backups are running
- **Performance**: Monitor query performance
- **Updates**: Keep PostgreSQL updated

### Security Updates

- **Dependencies**: Regularly update npm packages
- **Secrets**: Rotate JWT_SECRET and ENCRYPTION_KEY periodically
- **SSL**: Ensure SSL certificates are valid

### Encryption Configuration

For production deployments, ensure proper encryption is configured:

- **Database Connection Encryption**: Enable SSL/TLS for PostgreSQL connections (see [Security Guide](./docs/SECURITY.md#database-connection-encryption))
- **Database Encryption at Rest**: Use encrypted filesystem volumes for database data
- **Application-Level Encryption**: Encryption key configured via `ENCRYPTION_KEY` environment variable
- **Filesystem Encryption**: Verify host filesystem encryption is enabled

See [Security Guide](./docs/SECURITY.md) for detailed encryption recommendations and configuration steps.

## Additional Resources

- [Security Guide](./docs/SECURITY.md)
- [Integration Setup](./docs/INTEGRATIONS.md)
- [README](./README.md)
- [Hetzner Cloud Documentation](https://docs.hetzner.com/)

## Support

For deployment issues:

1. Check Docker logs: `docker compose -f docker-compose.prod.yml logs`
2. Review this guide
3. Check [Troubleshooting](#troubleshooting) section
4. Review application logs for specific errors



