# API Contracts

## Overview
This document defines the API contracts between microservices. All services must adhere to these contracts for consistent communication.

## Authentication Contract

### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "email": "user@example.com",
    "role": "user|admin|moderator",
    "iat": 1234567890,
    "exp": 1234567890
  }
}
```

### Authorization Header
```
Authorization: Bearer <jwt_token>
```

## Error Response Contract

### Standard Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": "Additional error details",
    "timestamp": "2025-07-13T10:30:00Z",
    "path": "/api/endpoint"
  }
}
```

## Success Response Contract

### Standard Success Response
```json
{
  "data": {
    // Actual response data
  },
  "meta": {
    "timestamp": "2025-07-13T10:30:00Z",
    "version": "1.0"
  }
}
```

### Paginated Response
```json
{
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "meta": {
    "timestamp": "2025-07-13T10:30:00Z",
    "version": "1.0"
  }
}
```

## Service Discovery Contract

### Health Check Endpoint
All services must implement:
```
GET /health
```

Response:
```json
{
  "status": "healthy|unhealthy",
  "timestamp": "2025-07-13T10:30:00Z",
  "version": "1.0.0",
  "dependencies": {
    "database": "healthy|unhealthy",
    "cache": "healthy|unhealthy"
  }
}
```

## Event-Driven Communication Contract

### Event Structure
All events must follow this structure:
```json
{
  "eventId": "unique-event-id",
  "eventType": "service.action",
  "version": "1.0",
  "timestamp": "2025-07-13T10:30:00Z",
  "source": "service-name",
  "data": {
    // Event-specific data
  }
}
```

### Event Types
- `user.created`
- `user.updated`
- `user.deleted`
- `order.placed`
- `order.confirmed`
- `order.shipped`
- `order.delivered`
- `order.cancelled`
- `payment.processed`
- `payment.failed`
- `payment.refunded`
- `product.created`
- `product.updated`
- `product.deleted`
- `inventory.updated`
- `blog.published`
- `analytics.generated`
