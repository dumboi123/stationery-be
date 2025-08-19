const redisClient = require("../config/redis");
const logger = require("../utils/logger");

/**
 * 🔥 Advanced Caching Middleware với Redis
 * Patterns từ Netflix, Uber, Airbnb
 */
class CacheMiddleware {
  constructor() {
    this.defaultTTL = 300; // 5 minutes
    this.compressionThreshold = 1024; // 1KB
  }

  /**
   * Response caching middleware (GET requests only)
   */
  cacheResponse(options = {}) {
    const {
      ttl = this.defaultTTL,
      prefix = "api_cache:",
      keyGenerator = this.defaultKeyGenerator,
      condition = this.defaultCondition,
      compress = true,
    } = options;

    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== "GET") {
        return next();
      }

      // Check condition
      if (!condition(req, res)) {
        return next();
      }

      try {
        const cacheKey = prefix + keyGenerator(req);

        // Try to get from cache
        const cachedData = await this.getFromCache(cacheKey);

        if (cachedData) {
          // Cache hit
          logger.debug("Cache hit", {
            key: cacheKey,
            path: req.path,
            method: req.method,
          });

          // Set cache headers
          res.setHeader("X-Cache-Status", "HIT");
          res.setHeader("X-Cache-Key", cacheKey);

          // Send cached response
          if (cachedData.headers) {
            Object.entries(cachedData.headers).forEach(([key, value]) => {
              res.setHeader(key, value);
            });
          }

          return res.status(cachedData.statusCode || 200).json(cachedData.data);
        }

        // Cache miss - intercept response
        const originalSend = res.send;
        const originalJson = res.json;

        res.send = function (data) {
          return cacheAndSend.call(this, data, originalSend);
        };

        res.json = function (data) {
          return cacheAndSend.call(this, data, originalJson);
        };

        const cacheAndSend = async function (data, originalMethod) {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const cacheData = {
              data: typeof data === "string" ? data : data,
              statusCode: res.statusCode,
              headers: {
                "Content-Type": res.getHeader("Content-Type"),
                "Cache-Control":
                  res.getHeader("Cache-Control") || "public, max-age=" + ttl,
              },
              timestamp: new Date().toISOString(),
            };

            // Store in cache (don't wait)
            setImmediate(async () => {
              try {
                await CacheMiddleware.prototype.setInCache(
                  cacheKey,
                  cacheData,
                  ttl
                );
                logger.debug("Response cached", {
                  key: cacheKey,
                  ttl,
                  size: JSON.stringify(cacheData).length,
                });
              } catch (error) {
                logger.warn("Failed to cache response", {
                  key: cacheKey,
                  error: error.message,
                });
              }
            });
          }

          // Set cache headers
          res.setHeader("X-Cache-Status", "MISS");
          res.setHeader("X-Cache-Key", cacheKey);

          return originalMethod.call(this, data);
        };

        next();
      } catch (error) {
        logger.warn("Cache middleware error", {
          path: req.path,
          error: error.message,
        });
        next(); // Continue without caching
      }
    };
  }

  /**
   * Manual cache operations
   */
  async getFromCache(key) {
    try {
      if (!redisClient.isConnected) {
        return null;
      }

      const data = await redisClient.get(key);
      return data;
    } catch (error) {
      logger.warn("Cache get error", { key, error: error.message });
      return null;
    }
  }

  async setInCache(key, data, ttl = this.defaultTTL) {
    try {
      if (!redisClient.isConnected) {
        return false;
      }

      await redisClient.set(key, data, ttl);
      return true;
    } catch (error) {
      logger.warn("Cache set error", { key, error: error.message });
      return false;
    }
  }

  async deleteFromCache(key) {
    try {
      if (!redisClient.isConnected) {
        return false;
      }

      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.warn("Cache delete error", { key, error: error.message });
      return false;
    }
  }

  /**
   * Cache invalidation patterns
   */
  invalidatePattern(pattern) {
    return async (req, res, next) => {
      // Store original methods
      const originalSend = res.send;
      const originalJson = res.json;

      // Override response methods
      const invalidateAndSend = async function (data, originalMethod) {
        // Invalidate cache after successful mutations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
            try {
              const keys = await this.getKeysByPattern(pattern);
              await Promise.all(keys.map((key) => this.deleteFromCache(key)));

              logger.info("Cache invalidated", {
                pattern,
                keysCount: keys.length,
                method: req.method,
                path: req.path,
              });
            } catch (error) {
              logger.warn("Cache invalidation failed", {
                pattern,
                error: error.message,
              });
            }
          }
        }

        return originalMethod.call(this, data);
      };

      res.send = function (data) {
        return invalidateAndSend.call(
          CacheMiddleware.prototype,
          data,
          originalSend
        );
      };

      res.json = function (data) {
        return invalidateAndSend.call(
          CacheMiddleware.prototype,
          data,
          originalJson
        );
      };

      next();
    };
  }

  /**
   * Default configurations
   */
  defaultKeyGenerator(req) {
    const query =
      Object.keys(req.query).length > 0
        ? "?" + new URLSearchParams(req.query).toString()
        : "";

    return `${req.method}:${req.path}${query}`;
  }

  defaultCondition(req, res) {
    // Don't cache authenticated requests by default
    return !req.headers.authorization;
  }

  async getKeysByPattern(pattern) {
    try {
      if (!redisClient.isConnected) {
        return [];
      }

      const client = redisClient.getClient();
      if (!client || !client.keys) {
        return [];
      }

      return await client.keys(pattern);
    } catch (error) {
      logger.warn("Get keys by pattern error", {
        pattern,
        error: error.message,
      });
      return [];
    }
  }
}

// Singleton instance
const cacheMiddleware = new CacheMiddleware();

module.exports = {
  CacheMiddleware,
  cacheResponse: (options) => cacheMiddleware.cacheResponse(options),
  invalidatePattern: (pattern) => cacheMiddleware.invalidatePattern(pattern),
  cache: cacheMiddleware,
};
