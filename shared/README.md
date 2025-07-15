# Shared Resources

This folder contains shared resources that can be used across all microservices in our multi-language architecture.

## 📁 Structure

```
shared/
├── proto/              # Protocol Buffer definitions (gRPC)
├── schemas/            # JSON schemas for validation
├── contracts/          # API contracts and documentation
└── docs/               # Architecture guides and documentation
```

## 🔧 Protocol Buffers (`proto/`)

Contains `.proto` files that define gRPC service contracts for inter-service communication.

### Available Services:
- `user.proto` - User management service
- `product.proto` - Product catalog service  
- `inventory.proto` - Inventory management service
- `cart.proto` - Shopping cart service
- `order.proto` - Order processing service
- `payment.proto` - Payment processing service
- `blog.proto` - Blog management service
- `analytics.proto` - Analytics service

### Generate Code:
```bash
# Basic generation (Go + Python)
make proto-gen

# Full generation (all languages)
make proto-gen-full
```

## 📋 JSON Schemas (`schemas/`)

### API Schemas (`schemas/api/`)
- `error-codes.json` - Standard error code definitions
- `status-codes.json` - HTTP status code mappings
- `service-registry.json` - Service configuration registry

### Event Schemas (`schemas/events/`)
- `user-created.json` - User creation event
- `order-placed.json` - Order placement event
- `payment-processed.json` - Payment processing event
- `product-created.json` - Product creation event
- `inventory-updated.json` - Inventory update event
- `blog-published.json` - Blog publication event

### Validate Schemas:
```bash
make validate-schemas
```

## 📖 Contracts (`contracts/`)

- `api-contracts.md` - API design contracts and standards

## 📚 Documentation (`docs/`)

- `architecture-guide.md` - Comprehensive architecture guidelines

## 🚀 Usage Examples

### 1. Error Handling
```javascript
// Load shared error codes
const errorCodes = require('./shared/schemas/api/error-codes.json');

// Usage in any service
if (!user) {
  return res.status(errorCodes.NOT_FOUND.code).json({
    error: errorCodes.NOT_FOUND
  });
}
```

### 2. Event Publishing
```python
# Load event schema
import json
with open('./shared/schemas/events/user-created.json') as f:
    schema = json.load(f)

# Create event following schema
event = {
    "eventId": "uuid4()",
    "eventType": "user.created",
    "version": "1.0",
    "timestamp": "2025-07-13T10:30:00Z",
    "source": "user-service",
    "data": {
        "userId": "user123",
        "email": "user@example.com",
        "username": "johndoe",
        "role": "user",
        "isActive": True
    }
}
```

### 3. Service Discovery
```go
// Load service registry
serviceRegistry := loadJSON("./shared/schemas/api/service-registry.json")

// Get service configuration
userService := serviceRegistry.Services["user-service"]
fmt.Printf("User service runs on port: %d", userService.Port)
```

## ⚠️ Important Notes

### What Can Be Shared:
✅ **Protocol Buffer definitions** (.proto files)  
✅ **JSON schemas** for validation  
✅ **API contracts** and documentation  
✅ **Configuration schemas**  
✅ **Event schemas**  

### What Cannot Be Shared:
❌ **Code implementations** (different languages)  
❌ **Business logic** (service-specific)  
❌ **Database schemas** (violates microservices principles)  
❌ **Language-specific libraries**  

## 🔄 Workflow

### Adding New Proto Definitions:
1. Create/update `.proto` file in `proto/`
2. Run `make proto-gen` to generate code
3. Update service implementations
4. Test gRPC communication

### Adding New Event Types:
1. Create JSON schema in `schemas/events/`
2. Update `api-contracts.md` documentation
3. Implement event publishing/subscribing in services
4. Validate with `make validate-schemas`

### Updating API Contracts:
1. Update `contracts/api-contracts.md`
2. Update related JSON schemas
3. Communicate changes to all service teams
4. Plan gradual migration if breaking changes

## 🏗️ Development Guidelines

1. **Backward Compatibility**: Always maintain backward compatibility in shared schemas
2. **Versioning**: Use semantic versioning for breaking changes
3. **Documentation**: Update documentation when adding new shared resources
4. **Validation**: Always validate JSON schemas before committing
5. **Communication**: Notify all teams when updating shared contracts
