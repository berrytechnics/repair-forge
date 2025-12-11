#!/bin/bash
set -e

echo "========================================="
echo "Circuit Sage - Hetzner Server Setup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

echo -e "${GREEN}Step 2: Installing essential tools...${NC}"
apt-get install -y \
    git \
    curl \
    wget \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

echo -e "${GREEN}Step 3: Installing Docker...${NC}"
# Remove old versions
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo -e "${GREEN}Step 4: Verifying Docker installation...${NC}"
docker --version
docker compose version

echo -e "${GREEN}Step 5: Configuring firewall (UFW)...${NC}"
# Allow SSH (be careful not to lock yourself out!)
ufw allow 22/tcp comment 'SSH'
# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
# Enable firewall
ufw --force enable

echo -e "${GREEN}Step 6: Setting up automatic security updates...${NC}"
apt-get install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

echo -e "${GREEN}Step 7: Creating application directory...${NC}"
APP_DIR="/opt/circuit-sage"
mkdir -p "$APP_DIR"
chmod 755 "$APP_DIR"

echo -e "${YELLOW}Note: If you're not using root, add your user to the docker group:${NC}"
echo -e "${YELLOW}  sudo usermod -aG docker \$USER${NC}"
echo -e "${YELLOW}  (You'll need to log out and back in for this to take effect)${NC}"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Server setup completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Clone your repository to $APP_DIR"
echo "2. Copy .env.production.example to .env.production and configure it"
echo "3. Run ./deployment/hetzner/deploy.sh"

