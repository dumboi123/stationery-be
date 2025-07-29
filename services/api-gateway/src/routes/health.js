const express = require("express");
const axios = require("axios");
const redisClient = require("../config/redis");
const config = require("../config");

const router = express.Router();

// Utility function để check service health
const checkService = async (serviceName, url, timeout = 5000) => {
  try {
    const start = Date.now();
    const response = await axios.get(`${url}/health`, {
      timeout,
      validateStatus: (status) => status === 200,
    });

    return {
      status: "healthy",
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
      message: "Service responding normally",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      responseTime: null,
      lastChecked: new Date().toISOString(),
      message: error.message || "Service unreachable",
      error: error.code || "UNKNOWN_ERROR",
    };
  }
};

// Check Redis connection
const checkRedis = async () => {
  try {
    const start = Date.now();
    await redisClient.ping();
    return {
      status: "healthy",
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
      message: "Redis connection active",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      responseTime: null,
      lastChecked: new Date().toISOString(),
      message: error.message || "Redis connection failed",
      error: error.code || "REDIS_ERROR",
    };
  }
};

// Basic health - cho load balancer (simple & fast)
router.get("/", (req, res) => {
  res.status(200).json({
    status: "OK !",
    timestamp: new Date().toISOString(),
    service: "api-gateway",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Detailed health - cho developers/monitoring
router.get("/detailed", async (req, res) => {
  try {
    const startTime = Date.now();

    // Check Redis
    const redisHealth = await checkRedis();

    // Check all microservices
    const serviceChecks = await Promise.allSettled([
      checkService("user-service", config.services.userService),
      checkService("product-service", config.services.productService),
      checkService("order-service", config.services.orderService),
      checkService("payment-service", config.services.paymentService),
      checkService("inventory-service", config.services.inventoryService),
      checkService("cart-service", config.services.cartService),
      checkService("blog-service", config.services.blogService),
    ]);

    // Process service check results
    const services = {};
    const serviceNames = [
      "user-service",
      "product-service",
      "order-service",
      "payment-service",
      "inventory-service",
      "cart-service",
      "blog-service",
    ];

    serviceChecks.forEach((result, index) => {
      const serviceName = serviceNames[index];
      services[serviceName] =
        result.status === "fulfilled"
          ? result.value
          : {
              status: "error",
              message: "Health check failed",
              error: result.reason?.message || "Unknown error",
            };
    });

    // Determine overall status
    const allServicesHealthy = Object.values(services).every(
      (s) => s.status === "healthy"
    );
    const redisHealthy = redisHealth.status === "healthy";
    const overallStatus =
      allServicesHealthy && redisHealthy ? "healthy" : "degraded";

    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        free: Math.round(
          (process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) /
            1024 /
            1024
        ),
        unit: "MB",
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: require("os").loadavg(),
      },
      dependencies: {
        redis: redisHealth,
        services: services,
      },
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      pid: process.pid,
    };

    // Set appropriate status code
    const statusCode = overallStatus === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Health check failed",
      error: error.message,
    });
  }
});

// Readiness check - cho Kubernetes/Docker
router.get("/ready", async (req, res) => {
  try {
    // Check critical dependencies
    const redisHealth = await checkRedis();

    const isReady = redisHealth.status === "healthy";

    if (isReady) {
      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
        message: "Service is ready to accept traffic",
      });
    } else {
      res.status(503).json({
        status: "not-ready",
        timestamp: new Date().toISOString(),
        message: "Service is not ready",
        issues: {
          redis: redisHealth.status !== "healthy" ? redisHealth.message : null,
        },
      });
    }
  } catch (error) {
    res.status(503).json({
      status: "not-ready",
      timestamp: new Date().toISOString(),
      message: "Readiness check failed",
      error: error.message,
    });
  }
});

// Liveness check - cho Kubernetes/Docker
router.get("/live", (req, res) => {
  // Simple check - chỉ cần process còn chạy
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    pid: process.pid,
  });
});

module.exports = router;
