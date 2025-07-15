# User Service

Dịch vụ quản lý người dùng trong kiến trúc microservices, xử lý xác thực, ủy quyền và quản lý thông tin người dùng.

## Tính năng

- ✅ Đăng ký và đăng nhập người dùng
- ✅ Xác thực JWT với Access Token và Refresh Token
- ✅ Quản lý thông tin cá nhân người dùng
- ✅ Bảo mật mật khẩu với bcrypt
- ✅ Middleware xác thực và ủy quyền
- ✅ Validation dữ liệu đầu vào
- ✅ Quản lý phiên đăng nhập
- ✅ Health check endpoint
- ✅ Database migrations
- ✅ Docker support
- ✅ Unit tests

## Công nghệ sử dụng

- **Ngôn ngữ**: Go 1.21
- **Framework**: Gin (HTTP web framework)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT tokens
- **Password Hashing**: bcrypt
- **Validation**: go-playground/validator
- **Testing**: testify
- **Containerization**: Docker

## Cấu trúc dự án

```
user-service/
├── cmd/
│   └── server/
│       └── main.go              # Entry point của ứng dụng
├── internal/
│   ├── config/
│   │   └── config.go            # Cấu hình ứng dụng
│   ├── database/
│   │   └── database.go          # Kết nối và migration database
│   ├── handlers/
│   │   └── user_handler.go      # HTTP handlers
│   ├── middleware/
│   │   └── middleware.go        # Authentication middleware
│   ├── models/
│   │   └── user.go             # Data models và structs
│   ├── repository/
│   │   └── user_repository.go   # Data access layer
│   ├── routes/
│   │   └── routes.go           # Route definitions
│   └── services/
│       └── user_service.go     # Business logic layer
├── tests/
│   └── user_test.go            # Unit tests
├── database/
│   └── init.sql                # Database initialization
├── .env.example                # Environment variables template
├── docker-compose.yml          # Docker compose cho development
├── Dockerfile                  # Docker image definition
├── go.mod                      # Go modules
└── README.md                   # Documentation
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/v1/auth/register` | Đăng ký người dùng mới |
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/refresh` | Làm mới access token |
| GET | `/api/v1/users/:id` | Lấy thông tin người dùng (public) |
| GET | `/health` | Health check |

### Protected Endpoints (Yêu cầu Authentication)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/user/profile` | Lấy thông tin cá nhân |
| PUT | `/api/v1/user/profile` | Cập nhật thông tin cá nhân |
| DELETE | `/api/v1/user/account` | Xóa tài khoản |

## Chạy dự án

### Với Docker (Khuyến nghị)

```bash
# Clone repository
git clone <repository-url>
cd user-service

# Sao chép file environment
cp .env.example .env

# Chạy với docker-compose
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f user-service
```

### Chạy local

```bash
# Cài đặt dependencies
go mod download

# Sao chép file environment
cp .env.example .env

# Chỉnh sửa file .env theo cấu hình local của bạn

# Chạy PostgreSQL và Redis (có thể dùng Docker)
docker run -d --name postgres \
  -e POSTGRES_DB=user_service_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:15-alpine

docker run -d --name redis \
  -p 6379:6379 redis:7-alpine

# Chạy ứng dụng
go run cmd/server/main.go
```

### Testing

```bash
# Chạy unit tests
go test ./tests/... -v

# Chạy tests với coverage
go test ./tests/... -v -cover

# Chạy benchmark tests
go test ./tests/... -bench=.
```

## Environment Variables

Tham khảo file `.env.example` để biết các biến môi trường cần thiết:

```env
# Server Configuration
SERVER_PORT=8001
SERVER_HOST=0.0.0.0
GIN_MODE=debug

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=user_service_db
DB_SSL_MODE=disable

# JWT Configuration
JWT_SECRET=your-super-secret-key
JWT_ACCESS_DURATION=15    # minutes
JWT_REFRESH_DURATION=24   # hours

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Kiến trúc và Design Patterns

- **Repository Pattern**: Tách biệt data access logic
- **Service Layer**: Business logic được tổ chức trong service layer
- **Middleware Pattern**: Authentication và authorization
- **Dependency Injection**: Loose coupling giữa các components
- **Configuration Management**: Centralized config với environment variables
- **Error Handling**: Consistent error responses
- **Logging**: Structured logging cho monitoring

## Monitoring và Health Checks

- Health check endpoint tại `/health`
- Structured logging với log levels
- Database connection monitoring
- Redis connection monitoring
- Metrics-ready architecture

## Security Features

- **Password Hashing**: bcrypt với cost factor 10
- **JWT Authentication**: Access và Refresh tokens
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Support**: Configurable CORS policies
- **Rate Limiting Ready**: Middleware hooks cho rate limiting

## Production Considerations

- **Database Connection Pooling**: Optimized connection management
- **Graceful Shutdown**: Proper cleanup on application termination
- **Environment-based Configuration**: Development, staging, production configs
- **Docker Multi-stage Builds**: Optimized container images
- **Health Checks**: Docker và Kubernetes health check support
- **Non-root User**: Security-hardened container execution

## Development Workflow

1. Tạo feature branch từ main
2. Implement changes
3. Chạy tests: `go test ./tests/... -v`
4. Update documentation nếu cần
5. Commit và push changes
6. Tạo Pull Request

## Liên hệ

Dự án này là một phần của kiến trúc microservices lớn hơn. Xem documentation chính tại repository root để biết thêm thông tin về toàn bộ hệ thống.
