/**
 * ✅ Rate Limiter Configuration
 * Advanced configuration cho production-ready rate limiting
 */

const config = {
  rateLimiting: {
    // ✅ Default settings
    windowMs: 15 * 60 * 1000, // 15 minutes

    // ✅ Role-based limits (requests per window)
    roleLimits: {
      admin: 10000, // Very high limit for admins
      premium: 5000, // High limit for premium users
      user: 1000, // Standard limit for regular users
      guest: 100, // Low limit for anonymous users
      api: 50000, // Special limit for API partners
    },

    // ✅ Endpoint-specific limits
    endpointLimits: {
      "/api/auth/login": {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per 15 minutes
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        message: {
          error: "Too many login attempts",
          code: "LOGIN_RATE_LIMIT",
          retryAfter: "15 minutes",
        },
      },

      "/api/auth/register": {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registrations per hour per IP
        message: {
          error: "Too many registration attempts",
          code: "REGISTER_RATE_LIMIT",
          retryAfter: "1 hour",
        },
      },

      "/api/auth/forgot-password": {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 password reset requests per hour
        message: {
          error: "Too many password reset requests",
          code: "PASSWORD_RESET_RATE_LIMIT",
          retryAfter: "1 hour",
        },
      },

      "/api/payments": {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 10, // 10 payment attempts per 5 minutes
        message: {
          error: "Too many payment requests",
          code: "PAYMENT_RATE_LIMIT",
        },
      },

      "/api/orders": {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 5, // 5 orders per minute
        message: {
          error: "Too many order creation requests",
          code: "ORDER_RATE_LIMIT",
        },
      },
    },

    // ✅ Dynamic limits based on user behavior
    dynamicLimits: {
      enabled: true,

      // Increase limit for good users
      goodUserMultiplier: 1.5,
      goodUserThreshold: 0.1, // < 10% rate limited requests

      // Decrease limit for problematic users
      badUserMultiplier: 0.5,
      badUserThreshold: 0.5, // > 50% rate limited requests

      // Minimum and maximum multipliers
      minMultiplier: 0.1,
      maxMultiplier: 3.0,
    },

    // ✅ IP Management
    ipManagement: {
      // Predefined whitelisted IPs/ranges
      whitelist: [
        "127.0.0.1", // Localhost
        "::1", // IPv6 localhost
        "10.0.0.0/8", // Internal network
        "172.16.0.0/12", // Internal network
        "192.168.0.0/16", // Internal network
      ],

      // Automatic blacklisting
      autoBlacklist: {
        enabled: true,
        threshold: 1000, // Auto-blacklist after 1000 rate-limited requests
        duration: 24 * 60 * 60 * 1000, // 24 hours
      },

      // Trusted partners/services
      trustedServices: [
        "api-partner-1.com",
        "monitoring-service.internal",
        "health-checker.internal",
      ],
    },

    // ✅ Analytics and Monitoring
    analytics: {
      enabled: true,
      retentionDays: 30, // Keep analytics for 30 days
      aggregationInterval: 5 * 60 * 1000, // 5 minutes

      // Metrics to track
      metrics: {
        requestCount: true,
        rateLimitedCount: true,
        responseTime: true,
        errorRate: true,
        uniqueIPs: true,
      },

      // Alert thresholds
      alerts: {
        highRateLimitPercent: 80, // Alert if >80% requests are rate limited
        suspiciousActivity: 50, // Alert if IP makes >50 requests/minute
        errorSpike: 100, // Alert if >100 errors in 5 minutes
      },
    },

    // ✅ Redis configuration
    redis: {
      enabled: true,
      keyPrefix: "rl:", // Rate limit key prefix
      resetExpiryOnChange: false,

      // Connection settings
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || "",
        db: process.env.REDIS_DB || 1,

        // Connection pooling
        family: 4,
        keepAlive: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,

        // Timeout settings
        connectTimeout: 10000,
        commandTimeout: 5000,
        lazyConnect: true,
      },

      // Fallback to memory store if Redis fails
      fallbackToMemory: true,
      memoryStoreTTL: 15 * 60 * 1000, // 15 minutes for memory store
    },

    // ✅ Headers configuration
    headers: {
      includeHeaders: true,

      // Standard headers
      limit: "X-RateLimit-Limit",
      remaining: "X-RateLimit-Remaining",
      reset: "X-RateLimit-Reset",

      // Custom headers
      retryAfter: "Retry-After",
      policy: "X-RateLimit-Policy",
      scope: "X-RateLimit-Scope",
    },

    // ✅ Security settings
    security: {
      // Prevent header injection
      sanitizeHeaders: true,

      // Hide implementation details
      hideImplementationDetails: true,

      // Rate limit bypass detection
      bypassDetection: {
        enabled: true,
        suspiciousPatterns: [
          /x-forwarded-for.*,.*,/i, // Multiple proxy headers
          /x-real-ip.*[,;]/i, // Suspicious real IP headers
        ],
      },
    },

    // ✅ Performance optimization
    performance: {
      // Skip certain request types
      skipOptions: true, // Skip OPTIONS requests
      skipHead: true, // Skip HEAD requests
      skipPreflight: true, // Skip CORS preflight

      // Request grouping
      groupRequests: {
        enabled: true,
        static: /\.(css|js|png|jpg|gif|ico|svg|woff|woff2)$/i,
        api: /^\/api\//i,
      },

      // Caching
      cacheResults: true,
      cacheTimeout: 60 * 1000, // 1 minute cache
    },

    // ✅ Development settings
    development: {
      enabled: process.env.NODE_ENV === "development",

      // Relaxed limits for development
      relaxedLimits: true,
      relaxedMultiplier: 10, // 10x higher limits in dev

      // Additional logging
      verboseLogging: true,
      logAllRequests: false, // Set to true for debugging

      // Mock mode (no actual limiting)
      mockMode: false,
    },
  },

  // ✅ Environment-specific overrides
  environments: {
    production: {
      rateLimiting: {
        windowMs: 15 * 60 * 1000,
        roleLimits: {
          admin: 10000,
          premium: 5000,
          user: 1000,
          guest: 100,
        },
        redis: {
          enabled: true,
          fallbackToMemory: false, // Strict Redis requirement
        },
        analytics: {
          enabled: true,
          retentionDays: 90, // Longer retention in prod
        },
      },
    },

    staging: {
      rateLimiting: {
        windowMs: 15 * 60 * 1000,
        roleLimits: {
          admin: 5000,
          premium: 2500,
          user: 500,
          guest: 50,
        },
        analytics: {
          retentionDays: 7,
        },
      },
    },

    development: {
      rateLimiting: {
        windowMs: 5 * 60 * 1000, // Shorter window for faster testing
        roleLimits: {
          admin: 50000, // Very high limits for development
          premium: 25000,
          user: 10000,
          guest: 1000,
        },
        redis: {
          fallbackToMemory: true, // Allow memory fallback in dev
        },
        development: {
          enabled: true,
          relaxedLimits: true,
          verboseLogging: true,
        },
      },
    },

    test: {
      rateLimiting: {
        windowMs: 1000, // 1 second window for fast tests
        roleLimits: {
          admin: 1000,
          premium: 500,
          user: 100,
          guest: 10,
        },
        redis: {
          enabled: false, // Use memory store for tests
          fallbackToMemory: true,
        },
        analytics: {
          enabled: false, // Disable analytics in tests
        },
      },
    },
  },
};

// ✅ Export environment-specific config
const environment = process.env.NODE_ENV || "development";
const environmentConfig = config.environments[environment] || {};

// Merge base config with environment-specific config
const mergeConfig = (base, override) => {
  const result = { ...base };

  for (const key in override) {
    if (
      override[key] &&
      typeof override[key] === "object" &&
      !Array.isArray(override[key])
    ) {
      result[key] = mergeConfig(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }

  return result;
};

module.exports = mergeConfig(config, environmentConfig);
