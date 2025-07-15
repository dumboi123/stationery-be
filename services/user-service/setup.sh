#!/bin/bash

# User Service Setup Script
# This script sets up the user service for development

set -e

echo "🚀 Setting up User Service..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21 or later."
    exit 1
fi

echo "✅ Go is installed: $(go version)"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker."
    exit 1
fi

echo "✅ Docker is installed: $(docker --version)"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker Compose is installed: $(docker-compose --version)"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your configuration."
else
    echo "✅ .env file already exists."
fi

# Download Go modules
echo "📦 Downloading Go modules..."
go mod download
echo "✅ Go modules downloaded."

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p tmp
echo "✅ Directories created."

# Check if PostgreSQL container is running
if ! docker ps | grep -q postgres; then
    echo "🐘 Starting PostgreSQL container..."
    docker run -d --name user-postgres \
        -e POSTGRES_DB=user_service_db \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres123 \
        -p 5433:5432 \
        postgres:15-alpine
    
    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
    echo "✅ PostgreSQL is ready."
else
    echo "✅ PostgreSQL container is already running."
fi

# Check if Redis container is running
if ! docker ps | grep -q redis; then
    echo "🔴 Starting Redis container..."
    docker run -d --name user-redis \
        -p 6380:6379 \
        redis:7-alpine
    
    echo "⏳ Waiting for Redis to be ready..."
    sleep 5
    echo "✅ Redis is ready."
else
    echo "✅ Redis container is already running."
fi

# Run tests to ensure everything is working
echo "🧪 Running tests..."
if go test ./tests/... -v; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed. Please check the output above."
fi

# Build the application
echo "🔨 Building the application..."
go build -o bin/user-service cmd/server/main.go
echo "✅ Application built successfully!"

echo ""
echo "🎉 User Service setup completed!"
echo ""
echo "To start the service:"
echo "  1. Update .env file with your configuration"
echo "  2. Run: go run cmd/server/main.go"
echo "  3. Or use Docker: docker-compose up -d"
echo ""
echo "API will be available at: http://localhost:8001"
echo "Health check: http://localhost:8001/health"
echo ""
echo "Database:"
echo "  PostgreSQL: localhost:5433"
echo "  Redis: localhost:6380"
echo ""
