# User Service Setup Script for Windows
# This script sets up the user service for development on Windows

Write-Host "🚀 Setting up User Service..." -ForegroundColor Green

# Check if Go is installed
try {
    $goVersion = go version
    Write-Host "✅ Go is installed: $goVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Go is not installed. Please install Go 1.21 or later." -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose is installed: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created. Please update it with your configuration." -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists." -ForegroundColor Green
}

# Download Go modules
Write-Host "📦 Downloading Go modules..." -ForegroundColor Yellow
go mod download
Write-Host "✅ Go modules downloaded." -ForegroundColor Green

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path logs | Out-Null
New-Item -ItemType Directory -Force -Path tmp | Out-Null
Write-Host "✅ Directories created." -ForegroundColor Green

# Check if PostgreSQL container is running
$postgresRunning = docker ps --format "table {{.Names}}" | Select-String "user-postgres"
if (-not $postgresRunning) {
    Write-Host "🐘 Starting PostgreSQL container..." -ForegroundColor Yellow
    docker run -d --name user-postgres `
        -e POSTGRES_DB=user_service_db `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=postgres123 `
        -p 5433:5432 `
        postgres:15-alpine
    
    # Wait for PostgreSQL to be ready
    Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    Start-Sleep 10
    Write-Host "✅ PostgreSQL is ready." -ForegroundColor Green
} else {
    Write-Host "✅ PostgreSQL container is already running." -ForegroundColor Green
}

# Check if Redis container is running
$redisRunning = docker ps --format "table {{.Names}}" | Select-String "user-redis"
if (-not $redisRunning) {
    Write-Host "🔴 Starting Redis container..." -ForegroundColor Yellow
    docker run -d --name user-redis `
        -p 6380:6379 `
        redis:7-alpine
    
    Write-Host "⏳ Waiting for Redis to be ready..." -ForegroundColor Yellow
    Start-Sleep 5
    Write-Host "✅ Redis is ready." -ForegroundColor Green
} else {
    Write-Host "✅ Redis container is already running." -ForegroundColor Green
}

# Run tests to ensure everything is working
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
$testResult = go test ./tests/... -v
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Please check the output above." -ForegroundColor Red
}

# Build the application
Write-Host "🔨 Building the application..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path bin | Out-Null
go build -o bin/user-service.exe cmd/server/main.go
Write-Host "✅ Application built successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 User Service setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the service:" -ForegroundColor Cyan
Write-Host "  1. Update .env file with your configuration" -ForegroundColor White
Write-Host "  2. Run: go run cmd/server/main.go" -ForegroundColor White
Write-Host "  3. Or use Docker: docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "API will be available at: http://localhost:8001" -ForegroundColor Cyan
Write-Host "Health check: http://localhost:8001/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database:" -ForegroundColor Cyan
Write-Host "  PostgreSQL: localhost:5433" -ForegroundColor White
Write-Host "  Redis: localhost:6380" -ForegroundColor White
Write-Host ""
