const config = require("../config");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Enhanced logging
  console.error("\n🚨 ==================== ERROR ====================");
  console.error(`❌ Error: ${err.message}`);
  console.error(`📍 URL: ${req.method} ${req.originalUrl}`);
  console.error(`🌐 IP: ${req.ip}`);
  console.error(`👤 User: ${req.user?.email || "anonymous"}`);
  console.error(`🕐 Time: ${new Date().toISOString()}`);
  console.error(`📊 Stack: ${err.stack}`);
  console.error("=================================================\n");

  // ============ GATEWAY SPECIFIC ERRORS ============

  // Service Connection Errors
  if (err.code === "ECONNREFUSED") {
    error = { message: "Service temporarily unavailable", statusCode: 503 };
  }

  if (err.code === "ENOTFOUND") {
    error = { message: "Service configuration error", statusCode: 502 };
  }

  if (err.code === "ETIMEDOUT") {
    error = { message: "Service response timeout", statusCode: 504 };
  }

  if (err.code === "ECONNRESET") {
    error = { message: "Connection was reset", statusCode: 503 };
  }

  // ============ PROXY ERRORS ============

  if (
    err.message?.includes("PROXY_ERROR") ||
    err.code === "HPE_INVALID_CHUNK_SIZE"
  ) {
    error = { message: "Gateway proxy error", statusCode: 502 };
  }

  // Circuit breaker errors
  if (err.message?.includes("CIRCUIT_BREAKER") || err.code === "CIRCUIT_OPEN") {
    error = { message: "Service circuit breaker is open", statusCode: 503 };
  }

  // ============ AUTHENTICATION ERRORS ============

  if (err.name === "JsonWebTokenError") {
    error = { message: "Invalid authentication token", statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    error = { message: "Authentication token has expired", statusCode: 401 };
  }

  if (err.name === "NotBeforeError") {
    error = { message: "Token not active yet", statusCode: 401 };
  }

  // ============ RATE LIMITING ERRORS ============

  if (err.status === 429 || err.type === "rate-limit") {
    error = {
      message: "Too many requests. Please slow down.",
      statusCode: 429,
      retryAfter: err.retryAfter || 60,
    };
  }

  // ============ VALIDATION ERRORS ============

  if (err.name === "ValidationError") {
    error = { message: "Request validation failed", statusCode: 400 };
  }

  // Body parser errors
  if (err.type === "entity.parse.failed") {
    error = { message: "Invalid JSON in request body", statusCode: 400 };
  }

  if (err.type === "entity.too.large") {
    error = { message: "Request payload too large", statusCode: 413 };
  }

  // ============ REDIS ERRORS (graceful handling) ============

  if (err.code === "ECONNREFUSED" && err.address?.includes("redis")) {
    console.warn("⚠️ Redis connection failed - continuing without cache");
    // Don't return error to client, just log it
    error = { message: "Service temporarily degraded", statusCode: 200 };
  }

  // ============ RESPONSE FORMATTING ============

  const statusCode = error.statusCode || 500;
  const isDevelopment = config.nodeEnv === "development";

  const errorResponse = {
    success: false,
    error: error.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    statusCode,
  };

  // Add request ID for tracking
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  // Add retry info for rate limiting
  if (statusCode === 429 && error.retryAfter) {
    errorResponse.retryAfter = error.retryAfter;
    res.setHeader("Retry-After", error.retryAfter);
  }

  // Development debug info
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.originalError = {
      name: err.name,
      code: err.code,
      type: err.type,
    };
  }

  // Log critical errors
  if (statusCode >= 500) {
    console.error("🔥 CRITICAL ERROR - Needs immediate attention!");
  }

  res.status(statusCode).json(errorResponse);
};

// Helper functions
const createError = (message, statusCode = 500, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  createError,
  asyncHandler,
};
