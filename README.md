# Multi-Language Microservices Architecture

A comprehensive microservices architecture built with Go, Python, Node.js, and Java, designed for learning and production use.

## 🏗️ Architecture Overview

This project implements a microservices architecture with the following services:

- **API Gateway** (Node.js, Express.js) + **Database: Redis** – Entry point for all client requests  
    _Node.js với Express.js phù hợp cho API Gateway nhờ khả năng xử lý bất đồng bộ, tốc độ cao và hệ sinh thái phong phú cho các tác vụ HTTP, xác thực, logging. Redis để cache và session management._

- **User Service** (Go, Gin hoặc Fiber) + **Database: PostgreSQL** – Quản lý người dùng và xác thực  
    _Go mạnh về hiệu năng, concurrency, phù hợp cho các service cần xử lý nhiều request như user/auth. Gin hoặc Fiber là framework phổ biến, dễ mở rộng. PostgreSQL cho dữ liệu quan trọng cần ACID._

- **Product Service** (Python, FastAPI) + **Database: PostgreSQL + Redis** – Quản lý danh mục sản phẩm  
    _Python với FastAPI giúp phát triển nhanh, dễ maintain, phù hợp cho các service CRUD, tích hợp tốt với Pydantic và SQLAlchemy. PostgreSQL cho dữ liệu chính, Redis cho caching._
<!-- 💡 Gợi ý: python is slow for read-heavy operations
                Giữ Python nhưng thêm caching layer (Redis)
                Hoặc chuyển sang Go cho performance
                FastAPI vẫn OK nếu có proper caching -->

- **Inventory Service** (Go, Gin hoặc Fiber) + **Database: PostgreSQL** – Quản lý tồn kho  
    _Go đảm bảo hiệu năng cao, dễ triển khai và mở rộng. Gin hoặc Fiber phù hợp cho các service cần xử lý đồng thời lớn, yêu cầu độ tin cậy và dễ bảo trì. PostgreSQL cho tính nhất quán dữ liệu._

- **Cart Service** (Node.js, Express.js) + **Database: Redis** – Quản lý giỏ hàng  
    _Node.js với Express.js kết hợp Redis phù hợp cho các service giỏ hàng nhờ khả năng xử lý bất đồng bộ, tốc độ cao và lưu trữ session hiệu quả. Redis cho temporary cart data._

- **Order Service** (Java, Spring Boot) + **Database: PostgreSQL** – Xử lý và quản lý đơn hàng  
    _Java với Spring Boot cung cấp framework mạnh mẽ, dễ bảo trì và mở rộng cho xử lý business logic phức tạp. PostgreSQL đảm bảo ACID cho transactions quan trọng._

- **Blog Service** (Node.js, NestJS) + **Database: PostgreSQL + Redis** – Quản lý bài viết, nội dung blog và tự động tạo, đăng bài theo lịch với AI  
    _Node.js với NestJS phù hợp cho các service nội dung nhờ khả năng mở rộng, hỗ trợ RESTful API, dễ tích hợp với các hệ thống khác. Tích hợp AI giúp tự động tạo nội dung và đăng bài theo lịch định sẵn. PostgreSQL cho content storage, Redis cho caching._

- **Analytics Service** (Java, Spring Boot) + **Database: PostgreSQL + ClickHouse** – Phân tích dữ liệu và báo cáo  
    _Java với Spring Boot phù hợp cho xử lý dữ liệu và business intelligence. PostgreSQL cho operational data, ClickHouse cho time-series analytics data._

- **Payment Service** (Go, Fiber hoặc Gin) + **Database: PostgreSQL** – Xử lý thanh toán  
    _Go phù hợp cho các service cần hiệu năng, độ ổn định cao, dễ triển khai concurrent payment processing. PostgreSQL để đảm bảo ACID cho financial transactions._

## 🛠️ Tech Stack

### Languages & Frameworks
- **Go**: Gin/Fiber framework with GORM
- **Python**: FastAPI with SQLAlchemy and Pydantic
- **Node.js**: Express.js with Prisma ORM or NestJS
- **Java**: Spring Boot with Spring Data JPA

### Infrastructure
- **Databases**: 
  - **PostgreSQL** (primary for transactional data)
  - **Redis** (caching and session storage)
  - **ClickHouse** (analytics and time-series data)
- **Message Queue**: Apache Kafka + Zookeeper
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes (for learning)
- **Load Balancer**: Nginx
- **Cloud**: AWS/GCP (deployment target) - OPTIONAL

### DevOps & Monitoring
- **CI/CD**: GitHub Actions
- **Infrastructure as Code**: Terraform
- **Monitoring**: Prometheus + Grafana
- **Logging**: Centralized logging with JSON format
- **Security**: JWT, OAuth2, HTTPS

### Must Have Tools 
- **Version Control**: Git/GitHub - Essential cho team collaboration
- **CI/CD**: GitHub Actions - Automated testing và deployment
- **API Documentation**: Swagger/OpenAPI 3.0 - API specification và testing
- **API Testing**: Postman Collections - Manual và automated API testing

### Development Tools
- **Communication**: gRPC (internal), REST (external)
- **Testing Frameworks**: Jest, pytest, JUnit 5, go test
- **Load Testing**: K6, Artillery
- **Code Quality**: ESLint, Prettier, SonarQube
- **Database Tools**: DBeaver, pgAdmin

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Make (optional, for convenience)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd BE-microservices
make setup
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services
```bash
# Development mode
make up-dev

# Production mode
make up-prod

# Basic mode
make up
```

### 4. Verify Installation
```bash
# Check service health
curl http://localhost:3000/health

# View logs
make logs
```

## 📁 Project Structure

```
BE-microservices/
├── services/                   # Microservices
│   ├── api-gateway/           # Node.js API Gateway
│   ├── user-service/          # Go User Service
│   ├── product-service/       # Python Product Service
│   ├── order-service/         # Java Order Service
│   ├── payment-service/       # Go Payment Service
│   ├── notification-service/  # Node.js Notification Service
│   └── analytics-service/     # Java Analytics Service
├── shared/                    # Shared libraries and schemas
│   ├── proto/                # gRPC definitions
│   ├── libraries/            # Language-specific shared code
│   └── types/                # Type definitions
├── infrastructure/           # Infrastructure configurations
│   ├── docker/              # Docker configurations
│   ├── kubernetes/          # K8s manifests
│   └── monitoring/          # Monitoring stack
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/               # End-to-end tests
├── docs/                   # Documentation
├── scripts/               # Automation scripts
└── database/             # Database schemas and migrations
```

## 🔧 Development

### Running Individual Services
```bash
# API Gateway
cd services/api-gateway
npm run dev

# User Service
cd services/user-service
go run cmd/main.go

# Product Service
cd services/product-service
uvicorn app.main:app --reload

# Order Service
cd services/order-service
./mvnw spring-boot:run

# Payment Service
cd services/payment-service
go run cmd/main.go
```

### Database Operations
```bash
# Run migrations
make db-migrate

# Seed database
make db-seed

# Reset database
make db-reset
```

### Testing
```bash
# Run all tests
make test

# Run specific test types
make test-unit
make test-integration
make test-e2e

# Run linting
make lint
```

### Code Generation
```bash
# Generate protobuf code
make proto-gen

# Generate API documentation
make docs
```

## 🔄 Git Workflow (Must Have Skills)

### Branching Strategy
```bash
# Feature development
git checkout -b feature/user-authentication
git add .
git commit -m "feat: implement JWT authentication"
git push origin feature/user-authentication

# Code review via Pull Request
# After approval and merge
git checkout main
git pull origin main
git branch -d feature/user-authentication
```

### Conventional Commits
- `feat:` new features
- `fix:` bug fixes  
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

### GitHub Actions Integration
- **Automated Testing**: Run tests on every PR
- **Code Quality**: SonarQube analysis
- **Deployment**: Auto-deploy to staging/production
- **Security**: Dependency vulnerability scanning

## 🔍 API Endpoints

### API Gateway (Port 3000)
- `GET /health` - Health check
- `POST /api/users/*` - User service routes
- `GET /api/products/*` - Product service routes
- `POST /api/orders/*` - Order service routes
- `POST /api/payments/*` - Payment service routes
- `GET /api/notifications/*` - Notification service routes
- `GET /api/analytics/*` - Analytics service routes

### Direct Service Access
- **User Service**: `http://localhost:8080`
- **Product Service**: `http://localhost:8000`
- **Order Service**: `http://localhost:8082`
- **Payment Service**: `http://localhost:8081`
- **Notification Service**: `http://localhost:3001`
- **Analytics Service**: `http://localhost:8083`

## 📊 Database Configuration

### Service-Database Mapping
- **API Gateway**: Redis (session & caching)
- **User Service**: PostgreSQL (user data, authentication)
- **Product Service**: PostgreSQL + Redis (products, inventory, caching)
- **Inventory Service**: PostgreSQL (stock management)
- **Cart Service**: Redis (temporary cart data)
- **Order Service**: PostgreSQL (orders, transactions)
- **Blog Service**: PostgreSQL + Redis (content, caching)
- **Analytics Service**: PostgreSQL + ClickHouse (operational + analytics data)
- **Payment Service**: PostgreSQL (financial transactions)

## 🐳 Docker Commands

### Basic Operations
```bash
# Build all services
make build

# Start services
make up

# Stop services
make down

# View logs
make logs

# Clean up
make clean
```

### Development
```bash
# Start with development configuration
make up-dev

# Access service shells
make shell-api
make shell-user
make shell-product

# Access database
make shell-db
make shell-redis
```

## 📊 Monitoring

### Start Monitoring Stack
```bash
make monitor
```

### Access Monitoring Tools
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Kibana**: http://localhost:5601
- **RabbitMQ Management**: http://localhost:15672 (admin/password)

## 🧪 Testing Strategy

### Unit Tests
Each service has its own unit tests using language-specific frameworks:
- **Go**: `go test`
- **Python**: `pytest`
- **Node.js**: `jest`
- **Java**: `JUnit 5` with `@SpringBootTest`

### Integration Tests
Tests service-to-service communication and database interactions.

### End-to-End Tests
Tests complete user workflows across multiple services.

### Load Testing
Performance testing using K6 and Artillery.

## 🔐 Security

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- API key authentication for service-to-service

### Security Features
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention
- Security headers

## 🚢 Deployment

### Development
```bash
make up-dev
```

### Production
```bash
make up-prod
```

### Kubernetes
```bash
kubectl apply -f infrastructure/kubernetes/
```

## 📈 Performance Optimization

### Caching Strategy
- Redis for session storage
- Database query caching
- API response caching

### Database Optimization
- Connection pooling
- Read replicas
- Query optimization

### Service Communication
- gRPC for internal communication
- REST for external APIs
- Message queues for async processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow language-specific coding standards
- Write comprehensive tests
- Update documentation
- Use conventional commit messages

## 📚 Documentation

- [API Documentation](./docs/api/)
- [Architecture Guide](./docs/architecture/)
- [Development Guide](./docs/guides/development/)
- [Deployment Guide](./docs/deployment/)

## 🐛 Troubleshooting

### Common Issues
1. **Port conflicts**: Check if ports 3000-8083 are available
2. **Database connection**: Ensure PostgreSQL is running
3. **Redis connection**: Verify Redis is accessible
4. **Docker issues**: Try `make clean` and rebuild

### Debugging
```bash
# Check service logs
make logs-[service-name]

# Check container status
docker-compose ps

# Access service shell
make shell-[service-name]
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Member 1**: Go Developer (User Service, Payment Service)
- **Member 2**: Python Developer (Product Service)
- **Member 3**: Java Developer (Order Service, Analytics Service)
- **Member 4**: Node.js Developer (API Gateway, Notification Service, Blog Service)
- **Member 5**: DevOps Engineer (Infrastructure, CI/CD, Monitoring)

## 🙏 Acknowledgments

- Microservices architecture patterns
- Domain-driven design principles
- Cloud-native application development
- Open-source community contributions

## 📋 API Development Best Practices

### Swagger/OpenAPI Documentation ⭐⭐⭐⭐⭐
```yaml
# Example OpenAPI spec structure
openapi: 3.0.0
info:
  title: User Service API
  version: 1.0.0
paths:
  /api/users:
    get:
      summary: Get all users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
```

### Postman Testing ⭐⭐⭐⭐⭐
- **Collections**: Organize API endpoints by service
- **Environment Variables**: Dev, Staging, Production configs
- **Automated Tests**: Pre-request scripts và test assertions
- **CI Integration**: Newman command-line runner

### API Design Guidelines
- **RESTful URLs**: `/api/v1/users/{id}/orders`
- **HTTP Status Codes**: 200, 201, 400, 401, 404, 500
- **Response Format**: Consistent JSON structure
- **Error Handling**: Standardized error responses
- **Versioning**: `/api/v1/` prefix cho backward compatibility
