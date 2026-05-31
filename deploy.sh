#!/bin/bash
# SmartCam Deploy Script - Server Setup
set -e

echo "=== 1. System update ==="
apt-get update -y

echo "=== 2. Node.js 20 o'rnatish ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "=== 3. pnpm o'rnatish ==="
npm install -g pnpm pm2 2>/dev/null || true
pnpm -v

echo "=== 4. Nginx o'rnatish ==="
apt-get install -y nginx

echo "=== 5. Papkalar yaratish ==="
mkdir -p /var/www/smart-cam
mkdir -p /var/www/smart-cam/uploads/products

echo "=== DONE: Muhit tayyor ==="
