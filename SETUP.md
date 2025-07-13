# 🚀 Setup & Development Guide

> **Hướng dẫn chi tiết về cài đặt, phát triển và triển khai dự án Microservices**

## 📋 Prerequisites

### Required Software
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Make (Ubuntu/Debian)
sudo apt-get install make

# Install kubectl (optional)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm (optional)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Development Tools
- **IDE**: VS Code, IntelliJ IDEA, hoặc editor yêu thích
- **Database Tools**: DBeaver, pgAdmin
- **API Testing**: Postman hoặc Insomnia
- **Git**: Để quản lý version control

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd BE-microservices
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (chỉnh sửa theo environment của bạn)
nano .env
```

### 3. Start Services
```bash
# Start all services
make up

# Or for development with hot reload
make up-dev

# Or for production
make up-prod
```

### 4. Verify Setup
```bash
# Check service health
curl http://localhost:3000/health

# View all service logs
make logs

# Check specific service
make logs-user-service
```

## 🏗️ Project Structure

```
BE-microservices/
├── services/                   # Microservices
│   ├── api-gateway/           # Node.js API Gateway
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   ├── user-service/          # Go User Service
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── Dockerfile
│   │   ├── go.mod
│   │   └── README.md
│   ├── product-service/       # Python Product Service
│   │   ├── app/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── README.md
│   └── ...
├── shared/                    # Shared libraries
│   ├── proto/                # gRPC definitions
│   ├── types/                # Common type definitions
│   └── utils/                # Utility functions
├── infrastructure/           # Infrastructure configs
│   ├── docker/              # Docker configurations
│   ├── kubernetes/          # K8s manifests
│   ├── monitoring/          # Monitoring stack
│   └── terraform/           # Infrastructure as Code
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/               # End-to-end tests
├── docs/                   # Documentation
├── scripts/               # Automation scripts
├── .env.example           # Environment template
├── docker-compose.yml     # Development composition
├── docker-compose.prod.yml # Production composition
├── Makefile              # Build automation
└── README.md             # Project overview
```

## 🔧 Development Commands

### Docker Operations
```bash
# Build all services
make build

# Start services
make up                # Basic mode
make up-dev           # Development mode with hot reload
make up-prod          # Production mode

# Stop services
make down

# View logs
make logs                    # All services
make logs-api-gateway       # Specific service
make logs-user-service      # Specific service

# Clean up
make clean                  # Remove containers and volumes
make clean-images          # Remove Docker images
```

### Database Operations
```bash
# Run migrations
make db-migrate

# Seed database with test data
make db-seed

# Reset database (careful in production!)
make db-reset

# Backup database
make db-backup

# Access database shells
make shell-postgres        # PostgreSQL
make shell-mongodb         # MongoDB
make shell-redis          # Redis
```

### Service Development
```bash
# Access service shells for debugging
make shell-api-gateway
make shell-user-service
make shell-product-service

# Run individual services for development
cd services/user-service
go run cmd/main.go

cd services/product-service
uvicorn app.main:app --reload

cd services/api-gateway
npm run dev
```

### Testing
```bash
# Run all tests
make test

# Run specific test types
make test-unit            # Unit tests
make test-integration     # Integration tests
make test-e2e            # End-to-end tests

# Run tests for specific service
make test-user-service
make test-product-service

# Run load tests
make test-load
```

### Code Quality
```bash
# Run linting for all services
make lint

# Run specific language linters
make lint-go              # Go services
make lint-python          # Python services
make lint-node           # Node.js services
make lint-java           # Java services

# Format code
make format

# Generate API documentation
make docs
```

## 🐳 Docker Configuration

### Environment Files
Create `.env` file with necessary configuration:

```env
# Database Configuration
POSTGRES_DB=microservices_db
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_password

MONGODB_URI=mongodb://admin:password@mongodb:27017/products?authSource=admin
REDIS_URL=redis://redis:6379

# Service Ports
API_GATEWAY_PORT=3000
USER_SERVICE_PORT=8080
PRODUCT_SERVICE_PORT=8000
ORDER_SERVICE_PORT=8082

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key

# External Services
KAFKA_BROKERS=kafka:9092
ELASTICSEARCH_URL=http://elasticsearch:9200
```

### Docker Compose Services

#### Development Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Databases
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/postgres-init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:5.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongo --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3

  # Services
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "${API_GATEWAY_PORT}:3000"
    environment:
      - NODE_ENV=development
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    volumes:
      - ./services/api-gateway:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
```

## 🔍 Service Access & API Testing

### Service Endpoints
- **API Gateway**: http://localhost:3000
- **User Service**: http://localhost:8080
- **Product Service**: http://localhost:8000
- **Order Service**: http://localhost:8082
- **Payment Service**: http://localhost:8081

### Health Checks
```bash
# Check all services health
curl http://localhost:3000/health

# Individual service health
curl http://localhost:8080/health   # User Service
curl http://localhost:8000/health   # Product Service
curl http://localhost:8082/health   # Order Service
```

### API Testing with Postman
1. Import collections từ `./docs/postman/`
2. Set environment variables:
   - `base_url`: http://localhost:3000
   - `user_service_url`: http://localhost:8080
   - `product_service_url`: http://localhost:8000

### Example API Calls
```bash
# User Registration
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'

# User Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'

# Get Products
curl http://localhost:3000/api/products

# Create Product (with auth token)
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name": "Test Product", "price": 99.99, "category": "Electronics"}'
```

## 📊 Monitoring & Observability

### Start Monitoring Stack
```bash
# Start monitoring services
make monitor

# Or manually start with Docker Compose
docker-compose -f docker-compose.monitoring.yml up -d
```

### Access Monitoring Tools
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Kibana**: http://localhost:5601
- **Jaeger**: http://localhost:16686

### Custom Metrics
Each service exposes metrics at `/metrics` endpoint:
- User Service: http://localhost:8080/metrics
- Product Service: http://localhost:8000/metrics
- Order Service: http://localhost:8082/metrics

## 🧪 Testing Strategies

### Unit Tests
```bash
# Go services
cd services/user-service
go test -v ./...

# Python services
cd services/product-service
pytest tests/ -v --cov=app

# Node.js services
cd services/api-gateway
npm test

# Java services
cd services/order-service
./mvnw test
```

### Integration Tests
```bash
# Run integration tests với test database
make test-integration

# Specific integration tests
cd tests/integration
python -m pytest test_user_product_integration.py -v
```

### Load Testing
```bash
# K6 load testing
cd tests/load
k6 run user-registration-load-test.js

# Artillery testing
artillery run api-load-test.yml
```

## 🚢 Deployment

### Development Deployment
```bash
make up-dev
```

### Production Deployment
```bash
# Build production images
make build-prod

# Start production stack
make up-prod

# Or using Docker Compose directly
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/

# Or using Helm
helm install microservices ./infrastructure/helm/microservices-chart
```

### AWS/GCP Deployment
```bash
# Using Terraform
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port in .env file
```

#### Database Connection Issues
```bash
# Check database containers
docker-compose ps

# Check database logs
docker-compose logs postgres
docker-compose logs mongodb

# Reset database
make db-reset
```

#### Service Not Starting
```bash
# Check service logs
docker-compose logs <service-name>

# Rebuild service
docker-compose build <service-name>
docker-compose up <service-name>

# Check service dependencies
docker-compose ps
```

#### Memory/Performance Issues
```bash
# Check Docker resource usage
docker stats

# Clean up unused Docker resources
docker system prune -a

# Increase Docker memory limit
# Docker Desktop -> Settings -> Resources -> Memory
```

### Debugging Commands
```bash
# Access service containers
docker exec -it be-microservices_api-gateway_1 /bin/bash
docker exec -it be-microservices_user-service_1 /bin/sh

# Check network connectivity
docker network ls
docker network inspect be-microservices_default

# Monitor real-time logs
docker-compose logs -f api-gateway
docker-compose logs -f --tail=100 user-service
```

### Performance Monitoring
```bash
# Check service performance
curl http://localhost:3000/api/metrics

# Database performance
make db-stats

# System resource usage
htop
iostat -x 1
```

## 📚 Additional Resources

### Documentation Links
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

### Learning Materials
- [Microservices.io](https://microservices.io/)
- [12-Factor App](https://12factor.net/)
- [Cloud Native Computing Foundation](https://www.cncf.io/)

### Community Support
- [Docker Community](https://www.docker.com/community)
- [Kubernetes Community](https://kubernetes.io/community/)
- [Project GitHub Issues](https://github.com/your-repo/issues)
