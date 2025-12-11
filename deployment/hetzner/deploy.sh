#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Circuit Sage - Deployment Script"
echo "========================================="

# Check if running from project root
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo -e "${YELLOW}Please copy deployment/hetzner/env.production.example to .env.production and configure it.${NC}"
    exit 1
fi

# Load environment variables
set -a
source .env.production
set +a

# Validate required variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "ENCRYPTION_KEY" "ALLOWED_ORIGINS" "NEXT_PUBLIC_API_URL" "DOMAIN_NAME")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo -e "${GREEN}Step 1: Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

echo -e "${GREEN}Step 2: Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production down || true

echo -e "${GREEN}Step 3: Starting database first...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres

# Wait for database to be healthy
echo -e "${GREEN}Waiting for database to be ready...${NC}"
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_isready -U "${POSTGRES_USER:-circuit_sage_user}" -d "${POSTGRES_DB:-circuit_sage_db}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
    sleep 1
done
echo ""

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "${RED}Error: Database failed to become ready after ${MAX_WAIT} seconds${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs postgres
    exit 1
fi

echo -e "${GREEN}Step 4: Running database migrations...${NC}"

# Function to verify database state after migrations
verify_database_state() {
    local DB_USER="${POSTGRES_USER:-circuit_sage_user}"
    local DB_NAME="${POSTGRES_DB:-circuit_sage_db}"

    echo -e "${GREEN}Verifying database state...${NC}"

    # Check if migration tracking table exists
    if ! docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM schema_migrations LIMIT 1;" > /dev/null 2>&1; then
        echo -e "${RED}✗ Migration tracking table (schema_migrations) does not exist${NC}"
        return 1
    fi

    # Check critical tables exist
    local CRITICAL_TABLES=("companies" "users" "customers" "tickets" "invoices")
    local MISSING_TABLES=()

    for table in "${CRITICAL_TABLES[@]}"; do
        if ! docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
            MISSING_TABLES+=("$table")
        fi
    done

    if [ ${#MISSING_TABLES[@]} -ne 0 ]; then
        echo -e "${RED}✗ Critical tables missing: ${MISSING_TABLES[*]}${NC}"
        echo -e "${YELLOW}This indicates migrations reported success but tables were not created.${NC}"
        return 1
    fi

    # Get migration count
    local MIGRATION_COUNT=$(docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM schema_migrations;" | tr -d ' ')

    echo -e "${GREEN}✓ Database verification passed${NC}"
    echo -e "${GREEN}  - Migration tracking table exists${NC}"
    echo -e "${GREEN}  - All critical tables exist${NC}"
    echo -e "${GREEN}  - Migrations recorded: $MIGRATION_COUNT${NC}"

    return 0
}

# Start backend temporarily to run migrations
echo -e "${GREEN}Starting backend container for migrations...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend

# Wait for backend to start
echo -e "${GREEN}Waiting for backend to be ready...${NC}"
BACKEND_READY=false
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend test -f /app/dist/scripts/run-migrations.js 2>/dev/null; then
        BACKEND_READY=true
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ "$BACKEND_READY" = false ]; then
    echo -e "${RED}Error: Backend container failed to start or migration script not found${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs backend
    exit 1
fi

# Verify migrations directory exists in container
if ! docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend test -d /app/database/migrations 2>/dev/null; then
    echo -e "${RED}Error: Migrations directory not found in container at /app/database/migrations${NC}"
    echo -e "${YELLOW}Checking container filesystem...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend ls -la /app/database/ 2>&1 || true
    exit 1
fi

# Run migrations explicitly
echo -e "${GREEN}Running migrations...${NC}"
MIGRATION_ATTEMPTS=0
MAX_MIGRATION_ATTEMPTS=5
MIGRATION_SUCCESS=false
MIGRATION_OUTPUT=""

while [ $MIGRATION_ATTEMPTS -lt $MAX_MIGRATION_ATTEMPTS ]; do
    echo -e "${YELLOW}Migration attempt $((MIGRATION_ATTEMPTS + 1))/${MAX_MIGRATION_ATTEMPTS}...${NC}"

    # Capture migration output
    if MIGRATION_OUTPUT=$(docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend yarn migrate:prod 2>&1); then
        echo "$MIGRATION_OUTPUT"
        MIGRATION_SUCCESS=true

        # Verify database state after successful migration
        if verify_database_state; then
            echo -e "${GREEN}✓ Migrations completed and verified successfully${NC}"
            break
        else
            echo -e "${RED}✗ Migrations reported success but database verification failed${NC}"
            echo -e "${YELLOW}This may indicate a transaction persistence issue.${NC}"
            MIGRATION_ATTEMPTS=$((MIGRATION_ATTEMPTS + 1))
            if [ $MIGRATION_ATTEMPTS -lt $MAX_MIGRATION_ATTEMPTS ]; then
                echo -e "${YELLOW}Retrying migration...${NC}"
                sleep 3
            fi
        fi
    else
        echo "$MIGRATION_OUTPUT"
        MIGRATION_ATTEMPTS=$((MIGRATION_ATTEMPTS + 1))
        if [ $MIGRATION_ATTEMPTS -lt $MAX_MIGRATION_ATTEMPTS ]; then
            echo -e "${YELLOW}Migration attempt ${MIGRATION_ATTEMPTS} failed, retrying...${NC}"
            sleep 3
        fi
    fi
done

if [ "$MIGRATION_SUCCESS" = false ]; then
    echo -e "${RED}Error: Migrations failed after ${MAX_MIGRATION_ATTEMPTS} attempts${NC}"
    echo -e "${YELLOW}Migration output:${NC}"
    echo "$MIGRATION_OUTPUT"
    echo ""
    echo -e "${YELLOW}Backend logs:${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50 backend
    echo ""
    echo -e "${YELLOW}Database state:${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U "${POSTGRES_USER:-circuit_sage_user}" -d "${POSTGRES_DB:-circuit_sage_db}" -c "\dt" || true
    exit 1
fi

echo -e "${GREEN}Step 5: Starting all services...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo -e "${GREEN}Step 6: Waiting for services to be healthy...${NC}"
sleep 15

# Check if containers are running
if ! docker compose -f docker-compose.prod.yml --env-file .env.production ps | grep -q "Up"; then
    echo -e "${RED}Error: Some containers failed to start${NC}"
    echo -e "${YELLOW}Checking logs...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs
    exit 1
fi

echo -e "${GREEN}Step 7: Setting up Nginx configuration...${NC}"
# Copy nginx config
sudo cp deployment/hetzner/nginx.conf /etc/nginx/sites-available/circuit-sage

# Replace domain placeholder
sudo sed -i "s/yourdomain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/circuit-sage

# Enable site
sudo ln -sf /etc/nginx/sites-available/circuit-sage /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
if ! sudo nginx -t; then
    echo -e "${RED}Error: Nginx configuration test failed${NC}"
    exit 1
fi

echo -e "${GREEN}Step 8: Setting up SSL certificate...${NC}"
# Stop nginx and kill any orphaned processes
sudo pkill -9 nginx || true
sudo systemctl stop nginx || true
sleep 2

# Verify ports are free
if netstat -tlnp 2>/dev/null | grep -qE ':(80|443)' || ss -tlnp 2>/dev/null | grep -qE ':(80|443)'; then
    echo -e "${YELLOW}Warning: Ports 80 or 443 are still in use. Killing processes...${NC}"
    sudo fuser -k 80/tcp 443/tcp 2>/dev/null || true
    sleep 2
fi

# Check if certificate already exists that covers both domains
CERT_EXISTS=false
if sudo certbot certificates 2>/dev/null | grep -A 5 "Certificate Name:" | grep -q "$DOMAIN_NAME"; then
    # Check if any cert includes both domains
    if sudo certbot certificates 2>/dev/null | grep -A 10 "Certificate Name:" | grep -A 5 "$DOMAIN_NAME" | grep -q "www.$DOMAIN_NAME"; then
        echo -e "${GREEN}Certificate already exists that covers both domains${NC}"
        CERT_EXISTS=true
    fi
fi

# Obtain certificate for both domain and www subdomain (if not already exists)
if [ "$CERT_EXISTS" = false ]; then
    sudo certbot certonly --standalone \
        --preferred-challenges http \
        -d "$DOMAIN_NAME" \
        -d "www.$DOMAIN_NAME" \
        --email "${SSL_EMAIL:-admin@$DOMAIN_NAME}" \
        --agree-tos \
        --non-interactive || {
        echo -e "${YELLOW}Warning: SSL certificate setup failed. You may need to set up DNS first.${NC}"
        echo -e "${YELLOW}Continuing without SSL for now...${NC}"
    }
fi

# Update nginx config with SSL - use certbot nginx plugin for automatic configuration
if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ] || [ -f "/etc/letsencrypt/live/$DOMAIN_NAME-0001/fullchain.pem" ]; then
    echo -e "${GREEN}Configuring HTTPS in Nginx...${NC}"

    # Determine which certificate to use (prefer one that includes www)
    CERT_NAME="$DOMAIN_NAME"
    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
        # Check if this cert includes www by checking certbot certificates output
        if sudo certbot certificates 2>/dev/null | grep -A 5 "Certificate Name: $DOMAIN_NAME" | grep -q "www.$DOMAIN_NAME"; then
            CERT_NAME="$DOMAIN_NAME"
        elif [ -f "/etc/letsencrypt/live/$DOMAIN_NAME-0001/fullchain.pem" ]; then
            CERT_NAME="$DOMAIN_NAME-0001"
        fi
    elif [ -f "/etc/letsencrypt/live/$DOMAIN_NAME-0001/fullchain.pem" ]; then
        CERT_NAME="$DOMAIN_NAME-0001"
    fi

    # Ensure clean nginx config before certbot runs
    # Restore from template if config test fails (might be corrupted)
    if ! sudo nginx -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Nginx config appears corrupted, restoring from template...${NC}"
        sudo cp deployment/hetzner/nginx.conf /etc/nginx/sites-available/circuit-sage
        sudo sed -i "s/yourdomain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/circuit-sage
    fi

    # Kill nginx again before certbot runs (in case certbot started it)
    sudo pkill -9 nginx || true
    sudo systemctl stop nginx || true
    sleep 2

    # Use certbot's nginx plugin to automatically configure SSL for both domains
    # This is more reliable than manual sed edits
    CERTBOT_SUCCESS=false
    if sudo certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --non-interactive --agree-tos --email "${SSL_EMAIL:-admin@$DOMAIN_NAME}" --redirect 2>&1 | tee /tmp/certbot-output.log; then
        CERTBOT_SUCCESS=true
    else
        echo -e "${YELLOW}Certbot nginx plugin had issues, checking if SSL was configured...${NC}"
        # Check if certbot actually configured SSL (even if restart failed)
        if sudo nginx -t >/dev/null 2>&1 && sudo grep -q "ssl_certificate" /etc/nginx/sites-enabled/circuit-sage 2>/dev/null; then
            echo -e "${GREEN}SSL configuration found in nginx config${NC}"
            CERTBOT_SUCCESS=true
        fi
    fi

    if [ "$CERTBOT_SUCCESS" = false ]; then
        echo -e "${YELLOW}Certbot nginx plugin failed. Attempting fallback...${NC}"

        # Restore clean config and try certbot install
        sudo cp deployment/hetzner/nginx.conf /etc/nginx/sites-available/circuit-sage
        sudo sed -i "s/yourdomain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/circuit-sage

        # Try to install the certificate using certbot install
        if sudo certbot install --cert-name "$CERT_NAME" --nginx --non-interactive 2>/dev/null; then
            echo -e "${GREEN}Certificate installed successfully via certbot install${NC}"
            CERTBOT_SUCCESS=true
        else
            echo -e "${RED}Failed to install certificate automatically.${NC}"
            echo -e "${YELLOW}Please manually configure SSL in /etc/nginx/sites-available/circuit-sage${NC}"
            echo -e "${YELLOW}Certificate is available at: /etc/letsencrypt/live/$CERT_NAME/${NC}"
        fi
    fi

    echo -e "${GREEN}✓ SSL configuration completed${NC}"
else
    echo -e "${YELLOW}SSL certificate not found. Using HTTP only for now.${NC}"
    echo -e "${YELLOW}You can set up SSL later by running:${NC}"
    echo -e "${YELLOW}  sudo certbot certonly --standalone -d $DOMAIN_NAME${NC}"
    echo -e "${YELLOW}  Then run this deploy script again, or use: sudo certbot --nginx -d $DOMAIN_NAME${NC}"
fi

# Ensure nginx is properly started
# Kill any orphaned nginx processes that might be holding ports
sudo pkill -9 nginx || true
sleep 2

# Reload systemd to ensure it knows nginx is stopped
sudo systemctl daemon-reload

# Validate nginx configuration before starting
if ! sudo nginx -t; then
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    echo -e "${YELLOW}Attempting to restore clean config...${NC}"
    sudo cp deployment/hetzner/nginx.conf /etc/nginx/sites-available/circuit-sage
    sudo sed -i "s/yourdomain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/circuit-sage

    # If SSL was configured, try certbot install again
    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ] || [ -f "/etc/letsencrypt/live/$DOMAIN_NAME-0001/fullchain.pem" ]; then
        echo -e "${YELLOW}Re-running certbot to configure SSL...${NC}"
        sudo certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --non-interactive --agree-tos --email "${SSL_EMAIL:-admin@$DOMAIN_NAME}" --redirect || true
    fi

    # Test again
    if ! sudo nginx -t; then
        echo -e "${RED}✗ Nginx configuration still invalid after restore${NC}"
        echo -e "${YELLOW}Please check /etc/nginx/sites-available/circuit-sage manually${NC}"
        exit 1
    fi
fi

# Start nginx (or reload if certbot already started it)
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}Nginx is already running, reloading configuration...${NC}"
    sudo systemctl reload nginx
else
    echo -e "${GREEN}Starting nginx...${NC}"
    sudo systemctl start nginx
fi

# Ensure nginx is enabled on boot
sudo systemctl enable nginx

# Verify nginx is running
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx failed to start${NC}"
    sudo systemctl status nginx
    exit 1
fi

echo -e "${GREEN}Step 9: Setting up SSL certificate auto-renewal...${NC}"
# Add cron job for certificate renewal
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo -e "${GREEN}Step 10: Checking service health...${NC}"
sleep 10

# Check backend health with retries
BACKEND_HEALTHY=false
for i in {1..10}; do
    if curl -f -s http://localhost:4000/health > /dev/null 2>&1; then
        BACKEND_HEALTHY=true
        echo -e "${GREEN}✓ Backend is healthy${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

if [ "$BACKEND_HEALTHY" = false ]; then
    echo -e "${YELLOW}⚠ Backend health check failed${NC}"
    echo -e "${YELLOW}Checking backend logs...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50 backend
fi

# Check frontend with retries
FRONTEND_HEALTHY=false
for i in {1..10}; do
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        FRONTEND_HEALTHY=true
        echo -e "${GREEN}✓ Frontend is responding${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

if [ "$FRONTEND_HEALTHY" = false ]; then
    echo -e "${YELLOW}⚠ Frontend check failed${NC}"
    echo -e "${YELLOW}Checking frontend logs...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50 frontend
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Services are running:"
echo "  - Frontend: http://$DOMAIN_NAME (or http://$(hostname -I | awk '{print $1}'))"
echo "  - Backend API: http://$DOMAIN_NAME/api"
echo ""
echo "To view logs:"
echo "  docker compose -f docker-compose.prod.yml --env-file .env.production logs -f"
echo ""
echo "To stop services:"
echo "  docker compose -f docker-compose.prod.yml --env-file .env.production down"
echo ""
echo -e "${YELLOW}Important: Remove default admin credentials after first login!${NC}"

