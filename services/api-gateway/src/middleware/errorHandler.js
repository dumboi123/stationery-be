const config = require("../config");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Enhanced logging với nhiều thông tin hơn
  console.error("\n🚨 ==================== ERROR ====================");
  console.error(`❌ Error: ${err.message}`);
  console.error(`📍 URL: ${req.method} ${req.originalUrl}`);
  console.error(`🌐 IP: ${req.ip}`);
  console.error(`👤 User-Agent: ${req.get("User-Agent")}`);
  console.error(`🕐 Time: ${new Date().toISOString()}`);
  console.error(`📊 Stack: ${err.stack}`);
  console.error("=================================================\n");

  // ============ GATEWAY SPECIFIC ERRORS ============

  // Service Connection Errors
  if (err.code === "ECONNREFUSED") {
    const message = "Service temporarily unavailable. Please try again later.";
    error = { message, statusCode: 503 };
  }

  // DNS Resolution Errors
  if (err.code === "ENOTFOUND") {
    const message = "Service configuration error. Please contact support.";
    error = { message, statusCode: 502 };
  }

  // Timeout Errors
  if (err.code === "ETIMEDOUT") {
    const message = "Service response timeout. Please try again.";
    error = { message, statusCode: 504 };
  }

  // Network Errors
  if (err.code === "ECONNRESET") {
    const message = "Connection was reset. Please try again.";
    error = { message, statusCode: 503 };
  }

  // ============ HTTP PROXY ERRORS ============

  // Proxy middleware errors
  if (err.message?.includes("PROXY_ERROR")) {
    const message = "Gateway proxy error occurred.";
    error = { message, statusCode: 502 };
  }

  // ============ VALIDATION ERRORS ============

  // MongoDB CastError
  if (err.name === "CastError") {
    const message = "Invalid ID format provided.";
    error = { message, statusCode: 400 };
  }

  // MongoDB Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = field
      ? `${field} already exists. Please use a different value.`
      : "Duplicate field value entered.";
    error = { message, statusCode: 409 }; // 409 Conflict
  }

  // MongoDB Validation Error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((val) => val.message);
    const message =
      messages.length > 0 ? messages.join(", ") : "Validation failed";
    error = { message, statusCode: 400 };
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid authentication token.";
    error = { message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Authentication token has expired.";
    error = { message, statusCode: 401 };
  }

  // ============ RATE LIMITING ERRORS ============

  if (err.status === 429) {
    const message = "Too many requests. Please slow down.";
    error = { message, statusCode: 429 };
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

  // Thêm thông tin debug trong development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.originalError = err;
  }

  // Thêm requestId nếu có (useful cho tracking)
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  // Log thêm thông tin cho monitoring
  if (statusCode >= 500) {
    console.error("🔥 CRITICAL ERROR - Needs immediate attention!");
  }

  res.status(statusCode).json(errorResponse);
};

// Export additional error helpers
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
