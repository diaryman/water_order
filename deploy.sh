#!/bin/bash

# Stop on error
set -e

echo "🚀 Preparing for deployment..."

# 1. Create necessary directories
echo "📂 Creating directories..."
mkdir -p prisma
mkdir -p public/uploads

# 2. Ensure database file exists
if [ ! -f prisma/dev.db ]; then
    echo "Creating empty database file..."
    touch prisma/dev.db
fi

# 3. Set permissions
echo "🔒 Setting permissions..."
# Grant full access to ensure container (uid 1001) can read/write
chmod -R 777 prisma
chmod -R 777 public/uploads

# 4. Build and Start
echo "🐳 Building and Starting Containers..."
docker-compose down
docker-compose up -d --build

# 5. Run Migrations
echo "📦 Running Database Migrations..."
# Sleep a bit to ensure container is ready
sleep 5
docker-compose exec -T app npx prisma migrate deploy

echo "✅ Deployment Complete!"
echo "   App is running at http://localhost:3000"
echo "   Monitor logs with: docker-compose logs -f"
echo ""
echo "📝 To create default admin:"
echo "   docker-compose exec app npx prisma db seed"
