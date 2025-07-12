const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Service URLs
  services: {
    user: process.env.USER_SERVICE_URL || 'http://localhost:8080',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8000',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:8082',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8081',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3001',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8083'
  },
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'microservices_db',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || ''
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};

module.exports = config;
