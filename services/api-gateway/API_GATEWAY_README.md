# API Gateway Service

API Gateway cho kiến trúc microservices với JWT Authentication, Advanced Rate Limiting, Circuit Breaker, và nhiều tính năng bảo mật khác.

## 📋 Tính năng

### 🔐 JWT Authentication

- **Access Token** & **Refresh Token** system
- **Token Blacklisting** với Redis
- **Role-based Access Control** (RBAC)
- **Permission-based Authorization**
- **Automatic Token Refresh**

### 🚦 Advanced Rate Limiting

- **IP-based Rate Limiting**
- **User-role-based Rate Limiting**
- **Endpoint-specific Rate Limiting**
- **Dynamic Rate Limiting** based on system load
- **Redis-backed** distributed rate limiting
- **Smart Rate Limiting** with burst handling

### 🔄 Circuit Breaker Pattern

- **Auto-failover** khi service down
- **Health monitoring** cho từng service
- **Fallback responses** khi service unavailable
- **Statistics tracking** cho monitoring

### 🛡️ Security Features

- **Helmet.js** security headers
- **CORS** configuration
- **Request validation**
- **IP filtering** capabilities
- **Security logging** & monitoring

### 📊 Monitoring & Logging

- **Winston logging** với multiple transports
- **Request/Response logging**
- **Performance monitoring**
- **Health check endpoints**
- **Metrics collection**

## 🚀 Quick Start

### 1. Cài đặt Dependencies

```bash
cd services/api-gateway
npm install
```

### 2. Cấu hình Environment Variables

Tạo file `.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_GATEWAY_PORT=3000

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_PAYMENT_MAX=10

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Service URLs
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
INVENTORY_SERVICE_URL=http://localhost:3005
CART_SERVICE_URL=http://localhost:3006
BLOG_SERVICE_URL=http://localhost:3007
```

### 3. Khởi động Redis

```bash
# Sử dụng Docker
docker-compose up redis

# Hoặc local Redis
redis-server
```

### 4. Chạy Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📖 API Documentation

### Health Check Endpoints

| Endpoint           | Method | Description                        |
| ------------------ | ------ | ---------------------------------- |
| `/health`          | GET    | Basic health check                 |
| `/health/detailed` | GET    | Detailed health với service status |
| `/health/ready`    | GET    | Readiness check cho K8s            |
| `/health/live`     | GET    | Liveness check cho K8s             |

### Authentication Endpoints

| Endpoint             | Method | Description          |
| -------------------- | ------ | -------------------- |
| `/api/auth/login`    | POST   | User login           |
| `/api/auth/register` | POST   | User registration    |
| `/api/auth/refresh`  | POST   | Refresh access token |
| `/api/auth/logout`   | POST   | User logout          |

### Service Proxy Endpoints

| Endpoint           | Method | Description                |
| ------------------ | ------ | -------------------------- |
| `/api/users/*`     | ALL    | Proxy to User Service      |
| `/api/products/*`  | ALL    | Proxy to Product Service   |
| `/api/orders/*`    | ALL    | Proxy to Order Service     |
| `/api/payments/*`  | ALL    | Proxy to Payment Service   |
| `/api/inventory/*` | ALL    | Proxy to Inventory Service |
| `/api/cart/*`      | ALL    | Proxy to Cart Service      |
| `/api/blog/*`      | ALL    | Proxy to Blog Service      |

## 🔐 Authentication Usage

### 1. Login

```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### 2. Sử dụng Access Token

```javascript
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 3. Refresh Token

```javascript
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 4. Logout

```javascript
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 🚦 Rate Limiting

### Rate Limit Tiers

| User Role   | Requests/15min | Special Limits    |
| ----------- | -------------- | ----------------- |
| **Guest**   | 50             | Auth: 10/15min    |
| **User**    | 100            | Payment: 5/15min  |
| **Premium** | 200            | Payment: 10/15min |
| **Admin**   | 500            | No payment limit  |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1639587600
Retry-After: 900 (chỉ khi bị rate limited)
```

### Dynamic Rate Limiting

Rate limits tự động điều chỉnh dựa trên:

- **System load** (CPU, memory)
- **Time of day** (peak hours)
- **User behavior** patterns
- **Service health** status

## 🔄 Circuit Breaker

### States

1. **CLOSED** (Normal) - Requests đi qua bình thường
2. **OPEN** (Failed) - Requests bị block, return error ngay
3. **HALF_OPEN** (Testing) - Cho phép một số requests test

### Configuration

```javascript
{
  timeout: 10000,              // 10s timeout
  errorThresholdPercentage: 50, // 50% error rate triggers open
  resetTimeout: 30000,         // 30s before trying half-open
  rollingCountTimeout: 60000   // 1 minute rolling window
}
```

### Fallback Responses

Khi service down, API Gateway trả về:

```json
{
  "error": "Service Unavailable",
  "message": "user-service is currently unavailable",
  "code": "CIRCUIT_BREAKER_OPEN",
  "retryAfter": 30
}
```

## 🧪 Testing

### Chạy All Tests

```bash
npm test
```

### Chạy Specific Tests

```bash
# Authentication tests
npm run test:auth

# Rate limiting tests
npm run test:rate

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Files

```
tests/
├── index.js              # Main integration tests
├── auth.test.js          # JWT authentication tests
├── rateLimiting.test.js  # Rate limiting tests
└── setup.js              # Test configuration
```

### Example Test

```javascript
// Test JWT authentication
test("should allow access with valid token", async () => {
  const token = generateTestToken({ role: "user" });

  const response = await request(app)
    .get("/api/users/profile")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  expect(response.body).toHaveProperty("user");
});
```

## 📊 Monitoring

### Logs

```bash
# Development logs (console)
npm run dev

# Production logs (files)
logs/
├── error.log      # Error logs only
├── combined.log   # All logs
└── access.log     # HTTP access logs
```

### Log Formats

```javascript
// Request log
{
  "level": "info",
  "message": "GET /api/users 200 - 125ms",
  "requestId": "uuid-here",
  "method": "GET",
  "url": "/api/users",
  "statusCode": 200,
  "responseTime": 125,
  "ip": "192.168.1.100"
}

// Auth log
{
  "level": "info",
  "message": "Auth event: login",
  "type": "authentication",
  "event": "login",
  "userId": "user123",
  "ip": "192.168.1.100"
}
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2023-12-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 125,
    "total": 256,
    "free": 131,
    "unit": "MB"
  },
  "dependencies": {
    "redis": {
      "status": "healthy",
      "responseTime": 5,
      "message": "Redis connection active"
    },
    "services": {
      "user-service": {
        "status": "healthy",
        "responseTime": 120
      }
    }
  }
}
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
api-gateway:
  build: ./services/api-gateway
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=production
    - REDIS_URL=redis://redis:6379
  depends_on:
    - redis
  restart: unless-stopped
```

### Environment-specific Configs

```bash
# Development
NODE_ENV=development npm start

# Staging
NODE_ENV=staging npm start

# Production
NODE_ENV=production npm start
```

## 🔧 Configuration

### Config Structure

```javascript
// config/index.js
module.exports = {
  app: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  services: {
    userService: process.env.USER_SERVICE_URL || "http://localhost:3001",
    productService: process.env.PRODUCT_SERVICE_URL || "http://localhost:3002",
  },
};
```

## 📈 Performance

### Benchmarks

| Metric        | Target   | Actual    |
| ------------- | -------- | --------- |
| Response Time | < 100ms  | ~85ms     |
| Throughput    | 1000 RPS | 1200+ RPS |
| Memory Usage  | < 512MB  | ~256MB    |
| CPU Usage     | < 50%    | ~25%      |

### Optimization Tips

1. **Redis Connection Pooling**
2. **HTTP Keep-Alive** enabled
3. **Compression** for responses > 1KB
4. **Request/Response caching**
5. **Circuit breaker** prevents cascade failures

## 🔍 Troubleshooting

### Common Issues

#### 1. Redis Connection Error

```bash
Error: Redis connection failed
```

**Solution:**

```bash
# Check Redis status
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Check Redis logs
docker-compose logs redis
```

#### 2. JWT Token Invalid

```bash
Error: Invalid token
```

**Solutions:**

- Check JWT secrets in `.env`
- Verify token format: `Bearer <token>`
- Check token expiration
- Verify token not blacklisted

#### 3. Rate Limit Issues

```bash
Error: Too Many Requests
```

**Solutions:**

- Check Redis connection
- Verify rate limit configuration
- Check if IP is correctly detected
- Review rate limit headers

#### 4. Service Proxy Errors

```bash
Error: Bad Gateway
```

**Solutions:**

- Check target service health
- Verify service URLs in config
- Check circuit breaker status
- Review service logs

### Debug Mode

```bash
# Enable debug logging
DEBUG=api-gateway:* npm run dev

# Specific debug namespaces
DEBUG=api-gateway:auth,api-gateway:rate-limit npm run dev
```

## 🤝 Contributing

### Development Setup

1. **Clone repo**
2. **Install dependencies**: `npm install`
3. **Setup environment**: Copy `.env.example` to `.env`
4. **Start services**: `docker-compose up -d redis`
5. **Run tests**: `npm test`
6. **Start development**: `npm run dev`

### Code Style

- **ESLint** configuration included
- **Prettier** for formatting
- **Jest** for testing
- **Conventional Commits** preferred

### Pull Request Process

1. Create feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Update documentation
5. Submit PR with clear description

## 📝 License

MIT License - see LICENSE file for details.

---

## 📞 Support

Nếu có vấn đề gì, tạo issue trên GitHub hoặc liên hệ team development.

**Happy Coding!** 🚀
