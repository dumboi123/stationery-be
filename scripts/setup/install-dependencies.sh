#!/bin/bash

# Setup script for development environment

set -e

echo "🚀 Setting up Multi-Language Microservices Development Environment..."

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install $1 first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "📋 Checking prerequisites..."
check_tool "docker"
check_tool "docker-compose"
check_tool "git"

# Check for language runtimes (optional but recommended)
echo "📋 Checking language runtimes..."
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed ($(node --version))"
else
    echo "⚠️  Node.js is not installed (recommended for development)"
fi

if command -v go &> /dev/null; then
    echo "✅ Go is installed ($(go version))"
else
    echo "⚠️  Go is not installed (recommended for development)"
fi

if command -v python3 &> /dev/null; then
    echo "✅ Python is installed ($(python3 --version))"
else
    echo "⚠️  Python is not installed (recommended for development)"
fi

if command -v rustc &> /dev/null; then
    echo "✅ Rust is installed ($(rustc --version))"
else
    echo "⚠️  Rust is not installed (recommended for development)"
fi

# Create environment file
echo "📝 Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
else
    echo "⚠️  .env file already exists, skipping..."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p backups
mkdir -p tmp

# Set permissions for scripts
echo "🔧 Setting up script permissions..."
find scripts/ -name "*.sh" -exec chmod +x {} \;
chmod +x shared/proto/scripts/generate-all.sh

# Pull required Docker images
echo "🐳 Pulling required Docker images..."
docker pull postgres:13
docker pull redis:6-alpine
docker pull rabbitmq:3-management
docker pull nginx:alpine

# Build development images
echo "🏗️  Building development images..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --parallel

# Initialize database
echo "💾 Initializing database..."
docker-compose up -d postgres redis
sleep 10  # Wait for databases to be ready

# Run initial migrations (if available)
echo "🔄 Running initial setup..."
# docker-compose exec postgres psql -U admin -d microservices_db -f /docker-entrypoint-initdb.d/init.sql

# Generate protobuf code (if protoc is available)
if command -v protoc &> /dev/null; then
    echo "🔄 Generating protobuf code..."
    cd shared/proto
    ./scripts/generate-all.sh
    cd ../..
else
    echo "⚠️  protoc not installed, skipping protobuf generation"
fi

# Install pre-commit hooks (if available)
if command -v pre-commit &> /dev/null; then
    echo "🔗 Installing pre-commit hooks..."
    pre-commit install
else
    echo "⚠️  pre-commit not installed, skipping hooks setup"
fi

echo "✅ Development environment setup completed!"
echo ""
echo "🎉 Next steps:"
echo "1. Review and update .env file with your configuration"
echo "2. Run 'make up-dev' to start all services"
echo "3. Run 'make test' to verify everything is working"
echo "4. Visit http://localhost:3000/health to check API Gateway"
echo ""
echo "📚 Useful commands:"
echo "  make help          - Show all available commands"
echo "  make up-dev        - Start development environment"
echo "  make logs          - View logs from all services"
echo "  make test          - Run all tests"
echo "  make clean         - Clean up Docker resources"
echo ""
echo "Happy coding! 🚀"
