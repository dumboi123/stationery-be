const { createProxyMiddleware } = require("http-proxy-middleware");
const CircuitBreaker = require("opossum");
const config = require("../config");
const logger = require("../utils/logger");

// Circuit breaker options
const circuitBreakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 60000, // 1 minute rolling window
  rollingCountBuckets: 10, // Number of buckets in rolling window
  name: "service-proxy",
};

// Create circuit breakers for each service
const circuitBreakers = {};

// Initialize circuit breakers
Object.keys(config.services).forEach((serviceName) => {
  const serviceUrl = config.services[serviceName];
  const breaker = new CircuitBreaker(
    async (req, res, next) => {
      // Proxy logic here
      return new Promise((resolve, reject) => {
        const proxy = createProxyMiddleware({
          target: serviceUrl,
          changeOrigin: true,
          pathRewrite: (path, req) => {
            // Remove /api/{service} prefix
            return path.replace(
              `/api/${serviceName.replace("-service", "")}`,
              ""
            );
          },
          timeout: 10000,
          onProxyReq: (proxyReq, req, res) => {
            // Add tracing headers
            proxyReq.setHeader("X-Request-ID", req.requestId);
            proxyReq.setHeader("X-Forwarded-For", req.ip);
            proxyReq.setHeader("X-Gateway-Service", "api-gateway");

            logger.info(`Proxying to ${serviceName}`, {
              requestId: req.requestId,
              path: req.path,
              method: req.method,
              target: serviceUrl,
            });
          },
          onProxyRes: (proxyRes, req, res) => {
            logger.info(`Response from ${serviceName}`, {
              requestId: req.requestId,
              statusCode: proxyRes.statusCode,
              headers: proxyRes.headers,
            });
            resolve();
          },
          onError: (err, req, res) => {
            logger.error(`Proxy error for ${serviceName}`, {
              requestId: req.requestId,
              error: err.message,
              stack: err.stack,
            });
            reject(err);
          },
        });

        proxy(req, res, next);
      });
    },
    { ...circuitBreakerOptions, name: `${serviceName}-proxy` }
  );

  // Circuit breaker event handlers
  breaker.on("open", () => {
    logger.circuitBreaker(serviceName, "OPEN", {
      message: `Circuit breaker opened for ${serviceName}`,
    });
  });

  breaker.on("halfOpen", () => {
    logger.circuitBreaker(serviceName, "HALF_OPEN", {
      message: `Circuit breaker half-open for ${serviceName}`,
    });
  });

  breaker.on("close", () => {
    logger.circuitBreaker(serviceName, "CLOSED", {
      message: `Circuit breaker closed for ${serviceName}`,
    });
  });

  breaker.on("fallback", (data) => {
    logger.circuitBreaker(serviceName, "FALLBACK", {
      message: `Circuit breaker fallback triggered for ${serviceName}`,
      data,
    });
  });

  circuitBreakers[serviceName] = breaker;
});

// Generic proxy middleware
const createServiceProxy = (serviceName) => {
  const breaker = circuitBreakers[serviceName];

  if (!breaker) {
    throw new Error(`Circuit breaker not found for service: ${serviceName}`);
  }

  return async (req, res, next) => {
    try {
      await breaker.fire(req, res, next);
    } catch (error) {
      // Circuit breaker is open or request failed
      if (breaker.opened) {
        return res.status(503).json({
          error: "Service Unavailable",
          message: `${serviceName} is currently unavailable`,
          code: "CIRCUIT_BREAKER_OPEN",
          retryAfter: Math.ceil(breaker.options.resetTimeout / 1000),
        });
      }

      // Other errors
      logger.error(`Proxy middleware error for ${serviceName}`, {
        requestId: req.requestId,
        error: error.message,
        stack: error.stack,
      });

      return res.status(502).json({
        error: "Bad Gateway",
        message: `Failed to proxy request to ${serviceName}`,
        code: "PROXY_ERROR",
      });
    }
  };
};

// Service-specific proxy middlewares with proper name mapping
const serviceNameMapping = {
  userService: "userService",
  productService: "productService",
  orderService: "orderService",
  paymentService: "paymentService",
  inventoryService: "inventoryService",
  cartService: "cartService",
  blogService: "blogService",
};

const proxyMiddlewares = {
  userService: createServiceProxy("userService"),
  productService: createServiceProxy("productService"),
  orderService: createServiceProxy("orderService"),
  paymentService: createServiceProxy("paymentService"),
  inventoryService: createServiceProxy("inventoryService"),
  cartService: createServiceProxy("cartService"),
  blogService: createServiceProxy("blogService"),
};

// Load balancing proxy (round-robin)
const createLoadBalancedProxy = (serviceUrls, serviceName) => {
  let currentIndex = 0;

  return createProxyMiddleware({
    target: "http://placeholder", // Will be overridden
    changeOrigin: true,
    router: (req) => {
      // Round-robin selection
      const target = serviceUrls[currentIndex];
      currentIndex = (currentIndex + 1) % serviceUrls.length;

      logger.info(`Load balancing ${serviceName}`, {
        requestId: req.requestId,
        selectedTarget: target,
        targetIndex: currentIndex - 1,
      });

      return target;
    },
    pathRewrite: (path, req) => {
      return path.replace(`/api/${serviceName.replace("-service", "")}`, "");
    },
    timeout: 10000,
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader("X-Request-ID", req.requestId);
      proxyReq.setHeader("X-Forwarded-For", req.ip);
      proxyReq.setHeader("X-Gateway-Service", "api-gateway");
    },
    onError: (err, req, res) => {
      logger.error(`Load balancer error for ${serviceName}`, {
        requestId: req.requestId,
        error: err.message,
      });

      res.status(502).json({
        error: "Bad Gateway",
        message: `Service ${serviceName} is unavailable`,
        code: "LOAD_BALANCER_ERROR",
      });
    },
  });
};

// Health check for services
const checkServiceHealth = async (serviceName) => {
  const breaker = circuitBreakers[serviceName];
  return {
    name: serviceName,
    status: breaker.opened ? "unhealthy" : "healthy",
    circuitBreakerState: breaker.state,
    stats: breaker.stats,
  };
};

// Get all circuit breaker stats
const getCircuitBreakerStats = () => {
  const stats = {};
  Object.keys(circuitBreakers).forEach((serviceName) => {
    const breaker = circuitBreakers[serviceName];
    stats[serviceName] = {
      state: breaker.state,
      stats: breaker.stats,
      options: {
        timeout: breaker.options.timeout,
        errorThresholdPercentage: breaker.options.errorThresholdPercentage,
        resetTimeout: breaker.options.resetTimeout,
      },
    };
  });
  return stats;
};

module.exports = {
  proxyMiddlewares,
  createServiceProxy,
  createLoadBalancedProxy,
  checkServiceHealth,
  getCircuitBreakerStats,
  circuitBreakers,
};
