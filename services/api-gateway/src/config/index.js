const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  // JWT Configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production",
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    issuer: process.env.JWT_ISSUER || "api-gateway",
    audience: process.env.JWT_AUDIENCE || "microservices-app",
  },

  // Redis Configuration (từ docker-compose)
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || "password",
    db: process.env.REDIS_DB || 0,
    connectTimeout: 10000,
    lazyConnect: true,
  },

  // CORS Configuration
  cors: {
    allowedOrigins: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:80",
      "http://127.0.0.1:3000",
    ],
  },

  // Service URLs (từ docker-compose)
  services: {
    userService: process.env.USER_SERVICE_URL || "http://localhost:8080",
    productService: process.env.PRODUCT_SERVICE_URL || "http://localhost:8000",
    orderService: process.env.ORDER_SERVICE_URL || "http://localhost:8082",
    paymentService: process.env.PAYMENT_SERVICE_URL || "http://localhost:8081",
    notificationService:
      process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3001",
    inventoryService:
      process.env.INVENTORY_SERVICE_URL || "http://localhost:8084",
    cartService: process.env.CART_SERVICE_URL || "http://localhost:3002",
    blogService: process.env.BLOG_SERVICE_URL || "http://localhost:3003",
    analyticsService:
      process.env.ANALYTICS_SERVICE_URL || "http://localhost:8083",
  },

  // Rate Limiting Configuration
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    default: {
      max: 100,
      message: "Too many requests from this IP, please try again later.",
    },
    auth: {
      max: 5, // Chỉ 5 attempts đăng nhập trong 15 phút
      message: "Too many authentication attempts, please try again later.",
    },
    upload: {
      max: 10, // 10 uploads mỗi 15 phút
      message: "Upload limit exceeded, please try again later.",
    },
    api: {
      max: 1000, // 1000 API calls cho authenticated users
      message: "API rate limit exceeded for authenticated users.",
    },
  },
};

module.exports = config;
