const winston = require("winston");
const path = require("path");
const config = require("../config");

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = "\n" + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [];

// Console transport (always enabled in development)
if (config.nodeEnv === "development") {
  transports.push(
    new winston.transports.Console({
      level: "debug",
      format: consoleFormat,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: "info",
      format: consoleFormat,
    })
  );
}

// File transports (for production)
if (config.nodeEnv === "production") {
  // Đảm bảo logs directory tồn tại
  const fs = require("fs");
  const logsDir = path.join(__dirname, "../../logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      level: "info",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // Access log file (for requests)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "access.log"),
      level: "http",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.nodeEnv === "development" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
});

// Add custom methods for different log types
logger.request = (message, meta = {}) => {
  logger.http(message, { type: "request", ...meta });
};

logger.response = (message, meta = {}) => {
  logger.http(message, { type: "response", ...meta });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { type: "security", ...meta });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { type: "performance", ...meta });
};

logger.audit = (message, meta = {}) => {
  logger.info(message, { type: "audit", ...meta });
};

// Helper method để log API calls
logger.apiCall = (method, url, statusCode, responseTime, meta = {}) => {
  const level = statusCode >= 400 ? "warn" : "info";
  logger[level](`${method} ${url} ${statusCode} - ${responseTime}ms`, {
    type: "api-call",
    method,
    url,
    statusCode,
    responseTime,
    ...meta,
  });
};

// Helper method để log authentication events
logger.auth = (event, userId, ip, meta = {}) => {
  logger.info(`Auth event: ${event}`, {
    type: "authentication",
    event,
    userId,
    ip,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Helper method để log rate limiting events
logger.rateLimit = (ip, endpoint, limit, remaining, meta = {}) => {
  const level = remaining <= 0 ? "warn" : "debug";
  logger[level](`Rate limit check`, {
    type: "rate-limit",
    ip,
    endpoint,
    limit,
    remaining,
    ...meta,
  });
};

// Helper method để log circuit breaker events
logger.circuitBreaker = (service, state, meta = {}) => {
  const level = state === "OPEN" ? "error" : "info";
  logger[level](`Circuit breaker ${state}`, {
    type: "circuit-breaker",
    service,
    state,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

module.exports = logger;
