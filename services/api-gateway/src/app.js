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

// ✅ Import routes
const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");
const routes = require("./routes");

console.log("🎉 All modules loaded successfully!");

const app = express();

// Trust proxy (important cho rate limiting & IP detection)
app.set("trust proxy", 1);

// Security middleware - phải đặt đầu tiên
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

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
  req.startTime = Date.now();
  req.requestId = require("crypto").randomUUID();

  res.on("finish", () => {
    const responseTime = Date.now() - req.startTime;

    //Sử dụng logger.apiCall() (từ logger.js)
    logger.apiCall(req.method, req.path, res.statusCode, responseTime, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  });

  next();
});

// Health check routes - không cần auth và rate limiting
app.use("/health", healthRoutes);

// ✅ Apply rate limiting theo thứ tự ưu tiên:

// 1. Auth routes - có rate limiting đặc biệt cho login/register
app.use("/api/auth", authRoutes); // Rate limiting đã được apply trong auth routes

// 2. Protected API routes - áp dụng smart limiter
app.use(
  "/api",
  rateLimiter.smartLimiter, // Tự động phân biệt authenticated vs anonymous
  optionalAuth, // Auth không bắt buộc cho một số routes
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
  process.exit(1);
});

// Uncaught exception
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

module.exports = app;
