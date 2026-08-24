#!/bin/bash
set -e

echo "==> Installing all dependencies (including dev)..."
npm install --include=dev

echo "==> Setting execute permissions on binaries..."
chmod -R +x node_modules/.bin

echo "==> Building shared library..."
npm run build:shared

echo "==> Building backend..."
cd backend
npx tsc

echo "==> Generating Prisma client..."
chmod +x ../node_modules/.bin/prisma 2>/dev/null || true
../node_modules/.bin/prisma generate --schema=prisma/schema.prisma
cd ..

echo "==> Build complete!"
