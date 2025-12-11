# Operations Runbook

This document provides operational procedures for managing Circuit Sage in production.

## Table of Contents

- [Deployment](#deployment)
- [Rollback Procedure](#rollback-procedure)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Common Operations](#common-operations)
- [Monitoring Procedures](#monitoring-procedures)
- [Scaling Procedures](#scaling-procedures)

## Deployment

### Standard Deployment Process

1. **Pre-deployment Checklist**
   - Verify all tests pass: `npm run ci:all`
   - Review recent changes in git log
   - Check for breaking changes
   - Verify environment variables are set

2. **Deploy to Production**
   ```bash
   # SSH into production server
   ssh user@your-server.com

   # Navigate to application directory
   cd /opt/circuit-sage

   # Pull latest code
   git pull origin main

   # Rebuild and restart services
   docker compose -f docker-compose.prod.yml up -d --build

   # Verify deployment
   curl https://yourdomain.com/api/health
   ```

3. **Post-deployment Verification**
   - Check health endpoint responds with 200
   - Verify frontend loads correctly
   - Test critical user flows (login, create customer, etc.)
   - Monitor logs for errors: `docker compose -f docker-compose.prod.yml logs -f`

## Rollback Procedure

### Quick Rollback

```bash
# SSH into production server
ssh user@your-server.com
cd /opt/circuit-sage

# Find previous working commit
git log --oneline -10

# Checkout previous commit
git checkout <previous-commit-hash>

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Verify rollback
curl https://yourdomain.com/api/health
```

### Database Rollback

If database migrations need to be rolled back:

```bash
# Restore from backup
./scripts/restore-db.sh backups/circuit-sage-backup-YYYYMMDD_HHMMSS.sql.gz

# Or manually revert migration
docker compose -f docker-compose.prod.yml exec backend yarn migrate:undo
```

## Environment Variables

### Required Variables

See [DEPLOYMENT.md](../DEPLOYMENT.md#environment-variables-reference) for complete list.

### Updating Environment Variables

```bash
# Edit production environment file
nano .env.production

# Restart services to apply changes
docker compose -f docker-compose.prod.yml restart backend frontend
```

## Troubleshooting

### Services Won't Start

1. **Check container status**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

2. **View logs**
   ```bash
   docker compose -f docker-compose.prod.yml logs backend
   docker compose -f docker-compose.prod.yml logs frontend
   docker compose -f docker-compose.prod.yml logs postgres
   ```

3. **Common issues**
   - Port conflicts: Check if ports 3000, 4000, 5432 are in use
   - Database connection: Verify DB credentials in .env.production
   - Missing environment variables: Check all required vars are set

### Database Connection Issues

1. **Test database connection**
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db
   ```

2. **Check database logs**
   ```bash
   docker compose -f docker-compose.prod.yml logs postgres
   ```

3. **Verify connection pool**
   - Check `backend/src/config/connection.ts` for pool settings
   - Monitor connection count: `SELECT count(*) FROM pg_stat_activity;`

### High Memory Usage

1. **Check container memory**
   ```bash
   docker stats
   ```

2. **Restart services**
   ```bash
   docker compose -f docker-compose.prod.yml restart
   ```

3. **Review resource limits in docker-compose.prod.yml**

## Common Operations

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Restart Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Database Backup

```bash
# Manual backup
./scripts/backup-db.sh

# Automated backups run daily via cron (if configured)
```

### Database Restore

```bash
# Restore from backup
./scripts/restore-db.sh backups/circuit-sage-backup-YYYYMMDD_HHMMSS.sql.gz
```

### Run Migrations

```bash
# Migrations run automatically on backend startup
# To run manually:
docker compose -f docker-compose.prod.yml exec backend yarn migrate:prod
```

### Health Check

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Or use monitoring script
./scripts/monitor-health.sh https://yourdomain.com
```

## Monitoring Procedures

### Health Check Monitoring

Set up automated health checks using cron or monitoring service:

```bash
# Add to crontab (check every 5 minutes)
*/5 * * * * cd /opt/circuit-sage && ./scripts/monitor-health.sh https://yourdomain.com || echo "Health check failed" | mail -s "Circuit Sage Health Check Failed" admin@example.com
```

### Log Monitoring

Monitor logs for errors:

```bash
# Watch for errors in real-time
docker compose -f docker-compose.prod.yml logs -f backend | grep -i error

# Check for authentication failures
docker compose -f docker-compose.prod.yml logs backend | grep -i "authentication failure"

# Check for billing events
docker compose -f docker-compose.prod.yml logs backend | grep -i "billing event"
```

### Database Monitoring

```bash
# Check database size
docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db -c "SELECT pg_size_pretty(pg_database_size('circuit_sage_db'));"

# Check active connections
docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries (if pg_stat_statements enabled)
docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

## Scaling Procedures

### Horizontal Scaling

To scale backend services:

1. **Update docker-compose.prod.yml**
   ```yaml
   backend:
     deploy:
       replicas: 3
   ```

2. **Use Docker Swarm or Kubernetes** for production scaling

### Database Scaling

1. **Connection Pool Tuning**
   - Update `backend/src/config/connection.ts`
   - Adjust `max` connections based on load

2. **Read Replicas** (if needed)
   - Set up PostgreSQL read replicas
   - Update connection config to use read replicas for read queries

### Vertical Scaling

1. **Increase Server Resources**
   - Upgrade Hetzner server plan
   - Update Docker resource limits in docker-compose.prod.yml

2. **Database Resources**
   - Increase PostgreSQL shared_buffers
   - Adjust work_mem based on query patterns

## Incident Response

### Service Outage

1. **Immediate Actions**
   - Check health endpoint: `curl https://yourdomain.com/api/health`
   - Review logs: `docker compose -f docker-compose.prod.yml logs --tail=100`
   - Check server resources: `docker stats`

2. **If Database Issue**
   - Check database logs
   - Verify database is running: `docker compose -f docker-compose.prod.yml ps postgres`
   - Restore from backup if needed

3. **If Application Issue**
   - Check application logs
   - Verify environment variables
   - Consider rolling back to previous version

### Data Loss

1. **Immediate Actions**
   - Stop accepting new data if possible
   - Identify scope of data loss
   - Check backup availability

2. **Recovery**
   - Restore from most recent backup
   - Verify data integrity
   - Resume normal operations

### Security Incident

1. **Immediate Actions**
   - Review access logs
   - Check for unauthorized access
   - Rotate secrets (JWT_SECRET, ENCRYPTION_KEY)

2. **Containment**
   - Revoke compromised credentials
   - Update firewall rules if needed
   - Review and update security settings

## Maintenance Windows

### Scheduled Maintenance

1. **Notify users** (if applicable)
2. **Enable maintenance mode** (if implemented)
3. **Perform updates**
4. **Run health checks**
5. **Disable maintenance mode**

### Zero-Downtime Updates

1. **Deploy to staging first**
2. **Run smoke tests**
3. **Deploy to production during low-traffic period**
4. **Monitor closely for issues**
5. **Rollback if needed**

## Support Contacts

- **Technical Issues**: [Your support email]
- **Emergency**: [Your emergency contact]
- **Documentation**: See [README.md](../README.md) and [DEPLOYMENT.md](../DEPLOYMENT.md)

