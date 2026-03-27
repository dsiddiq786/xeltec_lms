#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive
export LC_ALL=C.UTF-8
ln -fs /usr/share/zoneinfo/UTC /etc/localtime

echo "Updating system..."
apt-get update
apt-get upgrade -y -o Dpkg::Options::='--force-confdef' -o Dpkg::Options::='--force-confold'

echo "Installing essential packages..."
apt-get install -y curl tar git

if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
fi

systemctl start docker
systemctl enable docker

echo "Setting up /opt/lms..."
mkdir -p /opt/lms

cd /opt/lms

if [ -f "/tmp/project.tar.gz" ]; then
    echo "Extracting project..."
    tar -xzf /tmp/project.tar.gz -C /opt/lms
    rm -f /tmp/project.tar.gz
else
    echo "Error: /tmp/project.tar.gz not found!"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "WARNING: No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "IMPORTANT: Edit /opt/lms/.env with your production values before proceeding!"
    exit 1
fi

echo "Starting Docker Compose..."
docker compose down || true
docker compose up -d --build --remove-orphans

echo ""
echo "========================================="
echo "  Deployment successful!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. If first time: Run ./deploy/init-letsencrypt.sh for SSL"
echo "  2. Check logs: docker compose logs -f"
echo "  3. Verify health: curl http://localhost:4000/api/health"
echo ""
