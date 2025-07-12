# API Gateway Service

## Overview
API Gateway service for the microservices architecture, built with Node.js and Express.

## Features
- Request routing to microservices
- Rate limiting
- Authentication middleware
- CORS handling
- Error handling
- Health checks

## Tech Stack
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Proxy**: http-proxy-middleware
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Morgan, Winston

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file:
```env
PORT=3000
NODE_ENV=development

# Service URLs
USER_SERVICE_URL=http://localhost:8080
PRODUCT_SERVICE_URL=http://localhost:8000
ORDER_SERVICE_URL=http://localhost:8082
PAYMENT_SERVICE_URL=http://localhost:8081
NOTIFICATION_SERVICE_URL=http://localhost:3001
ANALYTICS_SERVICE_URL=http://localhost:8083

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=microservices_db
DB_USER=admin
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Running the Service
```bash
# Development
npm run dev

# Production
npm start

# Testing
npm test

# Linting
npm run lint
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Proxied Routes
- `GET /api/users/*` - User service routes
- `GET /api/products/*` - Product service routes
- `GET /api/orders/*` - Order service routes
- `GET /api/payments/*` - Payment service routes
- `GET /api/notifications/*` - Notification service routes
- `GET /api/analytics/*` - Analytics service routes

## Docker

### Build
```bash
docker build -t api-gateway .
```

### Run
```bash
docker run -p 3000:3000 api-gateway
```

## Architecture
The API Gateway serves as the entry point for all client requests, routing them to appropriate microservices based on the URL path.

## Testing
```bash
# Unit tests
npm test

# With coverage
npm run test:coverage
```

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
