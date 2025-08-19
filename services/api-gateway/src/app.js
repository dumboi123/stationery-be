const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const config = require("./config");
const logger = require("./utils/logger");
const { errorHandler } = require("./middleware/errorHandler");
const { notFound } = require("./middleware/notFound");

// ✅ Import rate limiter và auth middleware
const { rateLimiter } = require("./middleware/rateLimiter");
const { optionalAuth } = require("./middleware/auth");

// 🔥 Import cache middleware
const { cacheResponse, invalidatePattern } = require("./middleware/cache");

// ✅ Import routes
const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");
const routes = require("./routes");

// 🔥 Redis connection initialization
const redisClient = require("./config/redis");

console.log("🎉 All modules loaded successfully!");

const app = express();

// 🚀 Initialize Redis connection (Netflix/Uber pattern)
const initializeRedis = async () => {
  try {
    logger.info("🔄 Initializing Redis connection...");
    const client = await redisClient.connect();

    if (client) {
      logger.info("✅ Redis initialized successfully", {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
      });
    } else {
      logger.warn("⚠️ Redis connection failed - continuing without cache", {
        fallbackMode: true,
      });
    }
  } catch (error) {
    logger.error("❌ Redis initialization error", {
      error: error.message,
      fallbackMode: true,
    });
  }
};

// Initialize Redis immediately
initializeRedis();

// Trust proxy (important cho rate limiting & IP detection)
app.set("trust proxy", 1);

// Security middleware
// Cấu hình Helmet tối ưu cho API Gateway trả về JSON
app.use(
  helmet({
    // Content Security Policy - Tối ưu cho API Gateway JSON
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https:", "wss:"], // Cho API calls và WebSockets
        scriptSrc: ["'self'"], // Chặt chẽ cho security
        styleSrc: ["'self'", "https:"], // Bỏ 'unsafe-inline' để tăng bảo mật
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:"], // Cho web fonts
        objectSrc: ["'none'"], // Chặn plugins nguy hiểm
        frameSrc: ["'none'"], // Chặn iframes
        childSrc: ["'self'"], // Cho web workers
        workerSrc: ["'self'"], // Cho service workers
        manifestSrc: ["'self'"], // Cho web app manifests
        mediaSrc: ["'self'"], // Cho audio/video
        formAction: ["'self'"], // Chỉ cho phép form submit đến cùng origin
        upgradeInsecureRequests: [], // Tự động upgrade HTTP thành HTTPS
      },
      reportOnly: false, // Set true trong development để test
    },

    // Cross-Origin Resource Policy - QUAN TRỌNG cho API Gateway
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Cho phép API calls từ các domain khác

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: { policy: "same-origin" },

    // Cross-Origin Embedder Policy - Tắt cho API Gateway
    crossOriginEmbedderPolicy: false,

    // Frame Options - Chống clickjacking
    frameguard: { action: "deny" },

    // HSTS - Chỉ bật trong production HTTPS
    hsts:
      process.env.NODE_ENV === "production"
        ? {
            maxAge: 31536000, // 1 năm
            includeSubDomains: true,
            preload: true,
          }
        : false,

    // Referrer Policy - Bảo vệ thông tin referrer
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },

    // Permissions Policy - Tắt các browser APIs không cần thiết
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      notifications: [],
      payment: [],
      usb: [],
      bluetooth: [],
      accelerometer: [],
      gyroscope: [],
      magnetometer: [],
      fullscreen: ["'self'"], // Cho phép fullscreen từ cùng origin
    },

    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },

    // Origin Agent Cluster
    originAgentCluster: true,

    // X-Content-Type-Options - Ngăn MIME sniffing
    noSniff: true,

    // X-XSS-Protection - Tắt XSS filter buggy
    xssFilter: true, // Helmet tự động set thành "0"

    // Hide X-Powered-By
    hidePoweredBy: true,

    // X-Download-Options cho IE
    ieNoOpen: true,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  })
);

// CORS configuration - Enterprise Level (9.5/10)
app.use(
  cors({
    // 🔥 Enterprise-grade origin validation
    origin: function (origin, callback) {
      // Cho phép requests không có origin (server-to-server, mobile apps)
      if (!origin) return callback(null, true);

      // 🔥 Strict domain validation
      const isAllowed = config.cors.allowedOrigins.includes(origin);

      if (isAllowed) {
        logger.debug(`CORS origin allowed: ${origin}`);
        return callback(null, true);
      }

      // 🚨 Security logging cho enterprise monitoring
      logger.security("CORS origin blocked", {
        origin,
        timestamp: new Date().toISOString(),
        severity: "MEDIUM",
      });

      // 🔥 Structured error response
      const error = new Error("Not allowed by CORS");
      error.statusCode = 403;
      error.code = "CORS_ORIGIN_DENIED";
      callback(error);
    },

    // 🔥 Enterprise methods - minimal but complete
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],

    // 🔥 Security-focused headers (Google/AWS standard)
    allowedHeaders: [
      // Core headers
      "Content-Type",
      "Authorization",
      "X-Requested-With",

      // API versioning (safe)
      "X-API-Version",
      "X-Client-Version",
      "X-Client-Platform",

      // Request tracing (safe)
      "X-Request-ID",
      "X-Correlation-ID",

      // Caching headers (standard)
      "If-None-Match",
      "If-Modified-Since",
      "Cache-Control",
      "Pragma",

      // Standard browser headers
      "Accept",
      "Accept-Language",
      "Accept-Encoding",
    ],

    // 🔥 Controlled response headers exposure
    exposedHeaders: [
      // Pagination info
      "X-Total-Count",
      "X-Page-Count",

      // Request tracing
      "X-Request-ID",

      // Rate limiting info (helps clients)
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",

      // Standard caching
      "ETag",
      "Last-Modified",
    ],

    // 🔥 Environment-specific credentials (AWS/Google pattern)
    credentials: process.env.NODE_ENV === "production",

    // 🔥 Smart preflight caching
    maxAge: process.env.NODE_ENV === "production" ? 86400 : 300,

    // 🔥 Enterprise options
    optionsSuccessStatus: 204, // For legacy browsers
    preflightContinue: false, // Handle preflight completely
  })
);
//CORS error handler
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      error: "CORS_BLOCKED",
      message: "Cross-origin request not allowed",
    });
  }
  next(err);
});

// Compression middleware
app.use(
  compression({
    level: 6, // Mức nén 1-9 (6 là balanced)
    threshold: 1024, // Chỉ nén file > 1KB
    filter: (req, res) => {
      // Không nén nếu client không support
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Body parsing middleware
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      // Lưu raw body để verify webhooks nếu cần
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging và tracing
app.use((req, res, next) => {
  // 1. 🔗 Generate unique request ID
  req.requestId = require("crypto").randomUUID();

  // 2. ⏱️ Track request timing
  req.startTime = process.hrtime.bigint(); // More precise than Date.now()

  // 3. 📊 Capture request details
  const requestDetails = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    contentType: req.get("Content-Type"),
    contentLength: req.get("Content-Length"),
    referer: req.get("Referer"),
    origin: req.get("Origin"),
    timestamp: new Date().toISOString(),
  };

  // 4. 🔒 Track authentication context
  if (req.headers.authorization) {
    requestDetails.hasAuth = true;
    requestDetails.authType = req.headers.authorization.split(" ")[0]; // Bearer, Basic, etc.
  }

  // 5. 🔄 Log incoming request (optional for debugging)
  if (process.env.NODE_ENV === "development") {
    logger.request(`Incoming ${req.method} ${req.path}`, requestDetails);
  }

  // 6. 📡 Response event listener
  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - req.startTime) / 1000000; // Convert to milliseconds

    // Enhanced response details
    const responseDetails = {
      ...requestDetails,
      statusCode: res.statusCode,
      responseTime: parseFloat(responseTime.toFixed(2)),
      contentType: res.getHeader("Content-Type"),
      contentLength: res.getHeader("Content-Length"),
      cacheControl: res.getHeader("Cache-Control"),
      compression: res.getHeader("Content-Encoding"),
    };

    // 🚨 Performance alerts
    if (responseTime > 1000) {
      // > 1 second
      logger.performance(`Slow request detected`, {
        ...responseDetails,
        alert: "SLOW_REQUEST",
        threshold: 1000,
      });
    }

    // 🔍 Error logging
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? "error" : "warn";
      logger[logLevel](
        `${req.method} ${req.path} ${res.statusCode} - ${responseTime}ms`,
        {
          ...responseDetails,
          type: "api-error",
        }
      );
    } else {
      // Success logging
      logger.apiCall(
        req.method,
        req.path,
        res.statusCode,
        responseTime,
        responseDetails
      );
    }

    // 📊 Special handling for auth endpoints
    if (req.path.startsWith("/api/auth")) {
      logger.auth("API call", null, req.ip, {
        endpoint: req.path,
        success: res.statusCode < 400,
        responseTime,
        requestId: req.requestId,
      });
    }
  });

  next();
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 API Gateway is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      "user-service": "/api/users",
      "product-service": "/api/products",
      "order-service": "/api/orders",
      "payment-service": "/api/payments",
      "inventory-service": "/api/inventory",
      "cart-service": "/api/cart",
      "blog-service": "/api/blog",
    },
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      api: "/api",
    },
  });
});

// Health check routes - không cần auth và rate limiting
app.use("/health", healthRoutes);

// ✅ Apply rate limiting theo thứ tự ưu tiên:

// 1. Auth routes - có rate limiting đặc biệt cho login/register
app.use("/api/auth", authRoutes); // Rate limiting đã được apply trong auth routes

// 2. Protected API routes với caching layer
app.use(
  "/api",
  rateLimiter.smartLimiter, // Smart rate limiting
  optionalAuth, // Optional authentication
  // 🔥 Cache layer cho GET requests
  cacheResponse({
    ttl: 300, // 5 minutes cache
    prefix: "api_cache:",
    condition: (req, res) => {
      // Cache public GET requests, không cache authenticated requests
      return req.method === "GET" && !req.headers.authorization;
    },
  }),
  // 🔥 Cache invalidation cho mutations
  invalidatePattern("api_cache:*"),
  routes
);

// 3. Fallback rate limiting cho các routes khác
app.use(rateLimiter.general);

// 404 handler
app.use(notFound);

// Global error handler - phải đặt cuối cùng
app.use(errorHandler);

// Unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // 🔥 Graceful Redis disconnection
  redisClient.disconnect().catch(console.error);
  process.exit(1);
});

// Uncaught exception
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  // 🔥 Graceful Redis disconnection
  redisClient.disconnect().catch(console.error);
  process.exit(1);
});

module.exports = app;
