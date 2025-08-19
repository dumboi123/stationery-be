const express = require("express");
const { proxyMiddlewares } = require("../middleware/proxy");
const { requireAuth } = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rateLimiter");
const logger = require("../utils/logger");

// ✅ Import admin routes
const rateLimitRoutes = require("./rateLimit");

const router = express.Router();

// API Documentation route
router.get("/", (req, res) => {
  res.json({
    message: "API Gateway - Microservices Backend",
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
      docs: "/api/docs",
    },
  });
});

// User Service Routes - Requires authentication for most operations
router.use(
  "/users",
  rateLimiter.createRoleBasedLimiter("user"),
  requireAuth,
  proxyMiddlewares.userService
);

// Public user routes (registration, login được handle ở auth routes)
router.use("/users/public", rateLimiter.general, proxyMiddlewares.userService);

// Product Service Routes - Mixed public/private
router.use(
  "/products",
  rateLimiter.general,
  // requireAuth, // Comment out nếu muốn public
  proxyMiddlewares.productService
);

// Order Service Routes - Requires authentication
router.use(
  "/orders",
  rateLimiter.createRoleBasedLimiter("user"),
  requireAuth,
  proxyMiddlewares.orderService
);

// Payment Service Routes - Requires authentication + special rate limiting
router.use(
  "/payments",
  rateLimiter.createEndpointLimiter("payment"), // ✅ Specific rate limiting cho payments
  requireAuth,
  proxyMiddlewares.paymentService
);

// Inventory Service Routes - Admin only for writes, public for reads
router.use(
  "/inventory",
  rateLimiter.general,
  // Có thể add role-based auth middleware ở đây
  proxyMiddlewares.inventoryService
);

// Cart Service Routes - Requires authentication
router.use(
  "/cart",
  rateLimiter.createRoleBasedLimiter("user"),
  requireAuth,
  proxyMiddlewares.cartService
);

// Blog Service Routes - Mixed public/private
router.use(
  "/blog",
  rateLimiter.general,
  // optionalAuth, // User có thể logged in hoặc không
  proxyMiddlewares.blogService
);

// API Documentation endpoint
router.get("/docs", (req, res) => {
  res.json({
    swagger: "2.0",
    info: {
      title: "Microservices API Gateway",
      version: "1.0.0",
      description: "API Gateway for microservices architecture",
    },
    host: req.get("host"),
    basePath: "/api",
    schemes: ["http", "https"],
    consumes: ["application/json"],
    produces: ["application/json"],
    paths: {
      "/users": {
        get: { summary: "Get users", tags: ["Users"] },
        post: { summary: "Create user", tags: ["Users"] },
      },
      "/products": {
        get: { summary: "Get products", tags: ["Products"] },
        post: { summary: "Create product", tags: ["Products"] },
      },
      "/orders": {
        get: { summary: "Get orders", tags: ["Orders"] },
        post: { summary: "Create order", tags: ["Orders"] },
      },
      "/payments": {
        post: { summary: "Process payment", tags: ["Payments"] },
      },
      "/inventory": {
        get: { summary: "Check inventory", tags: ["Inventory"] },
      },
      "/cart": {
        get: { summary: "Get cart", tags: ["Cart"] },
        post: { summary: "Add to cart", tags: ["Cart"] },
      },
      "/blog": {
        get: { summary: "Get blog posts", tags: ["Blog"] },
        post: { summary: "Create blog post", tags: ["Blog"] },
      },
    },
    securityDefinitions: {
      Bearer: {
        type: "apiKey",
        name: "Authorization",
        in: "header",
        description: "JWT Bearer token",
      },
    },
    security: [{ Bearer: [] }],
  });
});

// Error handling for route not found in this router
router.use("*", (req, res) => {
  logger.warn(`Route not found`, {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      "GET /api/",
      "GET /api/docs",
      "GET /api/health",
      "/api/users/*",
      "/api/products/*",
      "/api/orders/*",
      "/api/payments/*",
      "/api/inventory/*",
      "/api/cart/*",
      "/api/blog/*",
      "/api/admin/rate-limit/* (Admin only)",
    ],
  });
});

// ✅ Admin routes for rate limiting management
router.use("/admin/rate-limit", rateLimitRoutes);

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    const rateLimitHealth = await rateLimiter.healthCheck();

    res.json({
      success: true,
      message: "API Gateway is healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      rateLimiter: rateLimitHealth,
      availableRoutes: [
        "GET /api/",
        "GET /api/docs",
        "GET /api/health",
        "/api/users/*",
        "/api/products/*",
        "/api/orders/*",
        "/api/payments/*",
        "/api/inventory/*",
        "/api/cart/*",
        "/api/blog/*",
        "/api/admin/rate-limit/* (Admin only)",
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
