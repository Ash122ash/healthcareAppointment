#!/bin/bash
set -e

echo "==> Installing all dependencies (including dev)..."
npm install --include=dev

echo "==> Rebuilding native modules for Linux..."
npm rebuild bcrypt

echo "==> Setting execute permissions on binaries..."
chmod -R +x node_modules/.bin

echo "==> Building shared library..."
npm run build:shared

echo "==> Generating Prisma client (must run BEFORE tsc)..."
cd backend
chmod +x ../node_modules/.bin/prisma 2>/dev/null || true
../node_modules/.bin/prisma generate --schema=prisma/schema.prisma

echo "==> Compiling backend TypeScript..."
npx tsc
cd ..

echo "==> Build complete!"
