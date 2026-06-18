#!/bin/bash
set -e

echo "Cleaning..."
rm -rf .next standalone-build standalone-build.zip

echo "Building..."
NODE_ENV=production npm run build

echo "Assembling Standalone Package..."
mkdir -p standalone-build

# 1. Copy EVERYTHING from standalone (including the hidden .next folder)
# Using '.' instead of '*' ensures hidden files (like .next) are included
cp -r .next/standalone/. standalone-build/

# 2. Next.js standalone needs 'static' and 'public' INSIDE the package
# but they are not included by default in the standalone folder.
mkdir -p standalone-build/.next/static
cp -r .next/static/. standalone-build/.next/static/
cp -r public/. standalone-build/public/

# 3. Add your env and Dockerfile
[ -f .env.production ] && cp .env.production standalone-build/
cp Dockerfile standalone-build/

echo "Creating zip..."
zip -r standalone-build.zip standalone-build

echo "Done ✅"