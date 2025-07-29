const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const redisClient = require("../config/redis");
const config = require("../config");

class RateLimiterService {
  constructor() {
    this.redisStore = null;
    this.whitelist = new Set(); // IP whitelist
    this.blacklist = new Set(); // IP blacklist
    this.analytics = new Map(); // Rate limit analytics
    this.dynamicLimits = new Map(); // Dynamic limits per IP
  }

  /**
   * Lazy init Redis store
   */
  getRedisStore() {
    if (this.redisStore) return this.redisStore;

    try {
      if (redisClient.isConnected && redisClient.getClient()) {
        this.redisStore = new RedisStore({
          client: redisClient.getClient(),
          prefix: "rl:",
          resetExpiryOnChange: true,
        });
        console.log("✅ Redis Store initialized for rate limiting");
      }
    } catch (error) {
      console.warn("⚠️ Redis Store init failed, using memory store");
    }

    return this.redisStore;
  }

  /**
   * Create rate limiter với enhanced features
   */
  createLimiter(options = {}) {
    const defaultOptions = {
      windowMs: config.rateLimiting?.windowMs || 15 * 60 * 1000,
      max: 100,
      message: {
        success: false,
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => req.ip,
      onLimitReached: (req, res, options) => {
        this.trackRequest(req.ip, req.path, true);
        console.warn(
          `🚨 Rate limit exceeded - IP: ${req.ip}, Path: ${req.path}, User: ${
            req.user?.id || "anonymous"
          }`
        );
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Enhanced middleware with whitelist/blacklist checking
    return (req, res, next) => {
      const clientIp = req.ip;

      // Check whitelist
      if (this.whitelist.has(clientIp)) {
        this.trackRequest(clientIp, req.path, false);
        return next();
      }

      // Check blacklist
      if (this.blacklist.has(clientIp)) {
        this.trackRequest(clientIp, req.path, true);
        return res.status(429).json({
          success: false,
          error: "IP address is blacklisted",
          code: "IP_BLACKLISTED",
          retryAfter: 3600, // 1 hour
        });
      }

      // Try to use Redis store
      const store = this.getRedisStore();
      if (store) {
        mergedOptions.store = store;
      }

      // Track successful requests
      const originalNext = next;
      const enhancedNext = (...args) => {
        if (!args.length) {
          // No error passed
          this.trackRequest(clientIp, req.path, false);
        }
        return originalNext(...args);
      };

      const limiter = rateLimit(mergedOptions);
      return limiter(req, res, enhancedNext);
    };
  }

  // ✅ Các methods theo đúng cách app.js và routes đang sử dụng
  get general() {
    return this.createLimiter({
      max: config.rateLimiting?.default?.max || 100,
      message: {
        success: false,
        error: config.rateLimiting?.default?.message || "Too many requests",
        code: "GENERAL_RATE_LIMIT",
      },
    });
  }

  get auth() {
    return this.createLimiter({
      max: config.rateLimiting?.auth?.max || 5,
      message: {
        success: false,
        error: config.rateLimiting?.auth?.message || "Too many auth attempts",
        code: "AUTH_RATE_LIMIT",
      },
    });
  }

  get api() {
    return this.createLimiter({
      max: config.rateLimiting?.api?.max || 1000,
      message: {
        success: false,
        error: config.rateLimiting?.api?.message || "API rate limit exceeded",
        code: "API_RATE_LIMIT",
      },
    });
  }

  get payment() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: {
        success: false,
        error: "Payment rate limit exceeded",
        code: "PAYMENT_RATE_LIMIT",
      },
    });
  }

  // ✅ Endpoint-specific rate limiter
  createEndpointLimiter(endpointType) {
    const endpointConfigs = {
      login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 login attempts per 15 minutes
        skipSuccessfulRequests: true,
        keyGenerator: (req) => `login:${req.ip}`,
        message: {
          success: false,
          error: "Too many login attempts",
          code: "LOGIN_RATE_LIMIT",
          retryAfter: "15 minutes",
        },
      },

      register: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registrations per hour per IP
        keyGenerator: (req) => `register:${req.ip}`,
        message: {
          success: false,
          error: "Too many registration attempts",
          code: "REGISTER_RATE_LIMIT",
          retryAfter: "1 hour",
        },
      },

      forgotPassword: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 password reset requests per hour
        keyGenerator: (req) => `forgot-pwd:${req.ip}`,
        message: {
          success: false,
          error: "Too many password reset requests",
          code: "PASSWORD_RESET_RATE_LIMIT",
          retryAfter: "1 hour",
        },
      },

      payment: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 10, // 10 payment attempts per 5 minutes
        keyGenerator: (req) => `payment:${req.user?.id || req.ip}`,
        message: {
          success: false,
          error: "Too many payment requests",
          code: "PAYMENT_RATE_LIMIT",
          retryAfter: "5 minutes",
        },
      },

      order: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 5, // 5 orders per minute
        keyGenerator: (req) => `order:${req.user?.id || req.ip}`,
        message: {
          success: false,
          error: "Too many order creation requests",
          code: "ORDER_RATE_LIMIT",
          retryAfter: "1 minute",
        },
      },
    };

    const config = endpointConfigs[endpointType];
    if (!config) {
      console.warn(
        `⚠️ Unknown endpoint type: ${endpointType}, using general limiter`
      );
      return this.general;
    }

    return this.createLimiter(config);
  }
  createRoleBasedLimiter(role) {
    const roleLimits = {
      admin: 10000,
      premium: 5000,
      user: 1000,
      guest: 100,
    };

    return this.createLimiter({
      max: roleLimits[role] || 100,
      keyGenerator: (req) => `${role}:${req.user?.id || req.ip}`,
      message: {
        success: false,
        error: `Rate limit exceeded for ${role} role`,
        code: "ROLE_RATE_LIMIT",
        limit: roleLimits[role] || 100,
        role: role,
      },
    });
  }

  // ✅ Dynamic rate limiter dựa trên user behavior
  createDynamicLimiter(baseOptions = {}) {
    return (req, res, next) => {
      const clientIp = req.ip;
      const userHistory = this.getUserHistory(clientIp);
      const dynamicMax = this.calculateDynamicLimit(
        userHistory,
        baseOptions.max || 100
      );

      const limiter = this.createLimiter({
        ...baseOptions,
        max: dynamicMax,
        keyGenerator: (req) => `dynamic:${clientIp}`,
        message: {
          success: false,
          error: "Dynamic rate limit exceeded",
          code: "DYNAMIC_RATE_LIMIT",
          adjustedLimit: dynamicMax,
        },
      });

      return limiter(req, res, next);
    };
  }

  // ✅ Smart limiter cho authenticated vs anonymous
  get smartLimiter() {
    return (req, res, next) => {
      if (req.user) {
        // Authenticated user - higher limits
        const userRole = req.user.role || "user";
        return this.createRoleBasedLimiter(userRole)(req, res, next);
      } else {
        // Anonymous user - lower limits
        return this.general(req, res, next);
      }
    };
  }

  // ✅ IP Management Methods
  addToWhitelist(ip, reason = "") {
    this.whitelist.add(ip);
    console.log(`✅ IP ${ip} added to whitelist. Reason: ${reason}`);
  }

  removeFromWhitelist(ip) {
    this.whitelist.delete(ip);
    console.log(`🗑️ IP ${ip} removed from whitelist`);
  }

  addToBlacklist(ip, reason = "") {
    this.blacklist.add(ip);
    console.log(`🚫 IP ${ip} added to blacklist. Reason: ${reason}`);
  }

  removeFromBlacklist(ip) {
    this.blacklist.delete(ip);
    console.log(`✅ IP ${ip} removed from blacklist`);
  }

  // ✅ Analytics Methods
  trackRequest(ip, endpoint, limited = false) {
    const key = `${ip}:${endpoint}`;
    const stats = this.analytics.get(key) || {
      ip,
      endpoint,
      requests: 0,
      limited: 0,
      firstRequest: new Date(),
      lastRequest: null,
    };

    stats.requests++;
    if (limited) stats.limited++;
    stats.lastRequest = new Date();

    this.analytics.set(key, stats);
  }

  getUserHistory(ip) {
    const userStats = [];
    for (const [key, stats] of this.analytics.entries()) {
      if (key.startsWith(`${ip}:`)) {
        userStats.push(stats);
      }
    }
    return userStats;
  }

  calculateDynamicLimit(userHistory, baseLimit) {
    if (!userHistory.length) return baseLimit;

    const totalRequests = userHistory.reduce(
      (sum, stat) => sum + stat.requests,
      0
    );
    const totalLimited = userHistory.reduce(
      (sum, stat) => sum + stat.limited,
      0
    );
    const limitRatio = totalLimited / totalRequests;

    // Adjust limit based on user behavior
    if (limitRatio > 0.5) {
      // User is hitting limits frequently - reduce limit
      return Math.max(baseLimit * 0.5, 10);
    } else if (limitRatio < 0.1) {
      // Good user behavior - increase limit
      return Math.min(baseLimit * 1.5, baseLimit * 3);
    }

    return baseLimit;
  }

  // ✅ Health Check & Monitoring
  async healthCheck() {
    const redisConnected = this.redisStore !== null;
    const storeType = redisConnected ? "Redis" : "Memory";

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      store: {
        type: storeType,
        connected: redisConnected,
      },
      analytics: {
        totalTracked: this.analytics.size,
        whitelistedIPs: this.whitelist.size,
        blacklistedIPs: this.blacklist.size,
      },
      config: {
        windowMs: config.rateLimiting?.windowMs || 900000,
        defaultMax: config.rateLimiting?.default?.max || 100,
      },
    };
  }

  getAnalytics(ip = null) {
    if (ip) {
      return this.getUserHistory(ip);
    }

    return Array.from(this.analytics.values()).map((stat) => ({
      ...stat,
      limitRatio: stat.limited / stat.requests,
      avgRequestsPerDay:
        stat.requests /
        Math.max(1, (new Date() - stat.firstRequest) / (1000 * 60 * 60 * 24)),
    }));
  }

  getTopLimitedIPs(limit = 10) {
    return Array.from(this.analytics.values())
      .sort((a, b) => b.limited - a.limited)
      .slice(0, limit);
  }

  // ✅ Management Methods
  async resetUserLimits(ip) {
    try {
      if (this.redisStore) {
        const client = redisClient.getClient();
        if (client) {
          const keys = await client.keys(`rl:*${ip}*`);
          if (keys.length > 0) {
            await client.del(keys);
            console.log(`🔄 Reset rate limits for IP: ${ip}`);
          }
        }
      }

      // Also reset analytics for this IP
      for (const [key] of this.analytics.entries()) {
        if (key.startsWith(`${ip}:`)) {
          this.analytics.delete(key);
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ Error resetting limits for IP ${ip}:`, error.message);
      return false;
    }
  }

  clearAnalytics() {
    this.analytics.clear();
    console.log("🧹 Analytics data cleared");
  }

  // ✅ Bypass limiter cho internal services
  createBypassLimiter(trustedIPs = []) {
    const trustedSet = new Set(trustedIPs);

    return (req, res, next) => {
      const clientIp = req.ip;
      const isInternalService = req.headers["x-internal-service"];

      if (trustedSet.has(clientIp) || isInternalService) {
        console.log(
          `🎯 Rate limiting bypassed for trusted source: ${clientIp}`
        );
        return next();
      }

      return this.general(req, res, next);
    };
  }
}

// ✅ Export đúng theo cách app.js import
const rateLimiterInstance = new RateLimiterService();

module.exports = {
  rateLimiter: rateLimiterInstance,
  RateLimiterService, // Export class for testing
};
