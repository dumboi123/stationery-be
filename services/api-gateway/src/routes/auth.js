/**
 * Authentication Routes
 *
 * Handles:
 * - Login/Register proxy to user-service với rate limiting
 * - Token refresh
 * - Logout và token blacklisting
 * - Token verification
 * - User profile
 */

const express = require("express");
const jwtUtils = require("../utils/jwt");
const authMiddleware = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rateLimiter");
const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("../config");

const router = express.Router();

/**
 * POST /auth/login
 * Proxy login request đến user-service với rate limiting
 */
router.post(
  "/login",
  rateLimiter.createEndpointLimiter("login"), // ✅ Rate limit cho login attempts
  createProxyMiddleware({
    target: config.services.userService || "http://localhost:8080",
    changeOrigin: true,
    pathRewrite: {
      "^/auth/login": "/api/auth/login",
    },
    onProxyRes: (proxyRes, req, res) => {
      let body = "";

      proxyRes.on("data", (chunk) => {
        body += chunk;
      });

      proxyRes.on("end", () => {
        try {
          const data = JSON.parse(body);

          // Nếu login thành công, tạo JWT tokens
          if (proxyRes.statusCode === 200 && data.success) {
            const userPayload = {
              userId: data.user.id,
              email: data.user.email,
              role: data.user.role || "user",
              permissions: data.user.permissions || [],
            };

            const tokens = jwtUtils.generateTokenPair(userPayload);

            // Modify response để include tokens
            data.tokens = tokens;

            // Set refresh token as httpOnly cookie
            res.cookie("refreshToken", tokens.refreshToken, {
              httpOnly: true,
              secure: config.nodeEnv === "production",
              sameSite: "strict",
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            console.log(`✅ User logged in: ${data.user.email}`);
          }

          res.status(proxyRes.statusCode).json(data);
        } catch (error) {
          console.error("❌ Error processing login response:", error.message);
          res.status(500).json({
            success: false,
            error: "Internal server error during login processing",
          });
        }
      });
    },
    onError: (err, req, res) => {
      console.error("❌ Login proxy error:", err.message);
      res.status(503).json({
        success: false,
        error: "User service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    },
  })
);

/**
 * POST /auth/register
 * Proxy register request đến user-service với rate limiting
 */
router.post(
  "/register",
  rateLimiter.createEndpointLimiter("register"), // ✅ Rate limit cho registration attempts
  createProxyMiddleware({
    target: config.services.userService || "http://localhost:8080",
    changeOrigin: true,
    pathRewrite: {
      "^/auth/register": "/api/auth/register",
    },
    onProxyRes: (proxyRes, req, res) => {
      let body = "";

      proxyRes.on("data", (chunk) => {
        body += chunk;
      });

      proxyRes.on("end", () => {
        try {
          const data = JSON.parse(body);

          // Nếu register thành công, có thể tự động login
          if (proxyRes.statusCode === 201 && data.success && data.user) {
            console.log(`✅ New user registered: ${data.user.email}`);
          }

          res.status(proxyRes.statusCode).json(data);
        } catch (error) {
          console.error(
            "❌ Error processing register response:",
            error.message
          );
          res.status(500).json({
            success: false,
            error: "Internal server error during registration processing",
          });
        }
      });
    },
    onError: (err, req, res) => {
      console.error("❌ Register proxy error:", err.message);
      res.status(503).json({
        success: false,
        error: "User service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    },
  })
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: "Refresh token is required",
        code: "REFRESH_TOKEN_MISSING",
      });
    }

    // Verify refresh token
    const decoded = jwtUtils.verifyToken(refreshToken);

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        error: "Invalid token type",
        code: "INVALID_TOKEN_TYPE",
      });
    }

    // Check if refresh token is blacklisted
    const isBlacklisted = await authMiddleware.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: "Refresh token has been revoked",
        code: "TOKEN_REVOKED",
      });
    }

    // TODO: Fetch fresh user data từ user-service để đảm bảo thông tin mới nhất
    const userPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || "user",
      permissions: decoded.permissions || [],
    };

    const newAccessToken = jwtUtils.generateAccessToken(userPayload);

    console.log(`🔄 Token refreshed for user: ${decoded.email}`);

    res.json({
      success: true,
      accessToken: newAccessToken,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("❌ Token refresh error:", error.message);

    res.status(401).json({
      success: false,
      error: error.message || "Failed to refresh token",
      code: "REFRESH_FAILED",
    });
  }
});

/**
 * POST /auth/logout
 * Logout user và blacklist tokens
 */
router.post("/logout", authMiddleware.requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = jwtUtils.extractTokenFromHeader(authHeader);
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // Blacklist access token
    if (accessToken) {
      await authMiddleware.blacklistToken(accessToken);
    }

    // Blacklist refresh token
    if (refreshToken) {
      await authMiddleware.blacklistToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    console.log(`👋 User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Logout error:", error.message);

    res.status(500).json({
      success: false,
      error: "Failed to logout",
      code: "LOGOUT_FAILED",
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get("/me", authMiddleware.requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions,
      tokenIssuedAt: new Date(req.user.issuedAt * 1000),
      tokenExpiresAt: new Date(req.user.expiresAt * 1000),
    },
  });
});

/**
 * POST /auth/verify-token
 * Verify if token is valid
 */
router.post("/verify-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required",
      });
    }

    const decoded = jwtUtils.verifyToken(token);

    // Check if token is blacklisted
    const isBlacklisted = await authMiddleware.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.json({
        success: true,
        valid: false,
        error: "Token has been revoked",
      });
    }

    res.json({
      success: true,
      valid: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        type: decoded.type,
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        nearExpiry: jwtUtils.isTokenNearExpiry(decoded),
      },
    });
  } catch (error) {
    res.json({
      success: true,
      valid: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/change-password
 * Proxy change password request
 */
router.post(
  "/change-password",
  authMiddleware.requireAuth,
  createProxyMiddleware({
    target: config.services.userService || "http://localhost:8080",
    changeOrigin: true,
    pathRewrite: {
      "^/auth/change-password": "/api/auth/change-password",
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add user ID to request để user-service biết user nào đang đổi password
      proxyReq.setHeader("X-User-ID", req.user.userId);
      proxyReq.setHeader("X-User-Email", req.user.email);
    },
    onError: (err, req, res) => {
      console.error("❌ Change password proxy error:", err.message);
      res.status(503).json({
        success: false,
        error: "User service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    },
  })
);

/**
 * GET /auth/profile
 * Get full user profile from user-service
 */
router.get(
  "/profile",
  authMiddleware.requireAuth,
  createProxyMiddleware({
    target: config.services.userService || "http://localhost:8080",
    changeOrigin: true,
    pathRewrite: {
      "^/auth/profile": "/api/users/profile",
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward user info to user-service
      proxyReq.setHeader("X-User-ID", req.user.userId);
      proxyReq.setHeader("X-User-Email", req.user.email);
      proxyReq.setHeader("X-User-Role", req.user.role);
    },
    onError: (err, req, res) => {
      console.error("❌ Profile proxy error:", err.message);
      res.status(503).json({
        success: false,
        error: "User service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    },
  })
);

/**
 * POST /auth/forgot-password
 * Rate limited password reset requests
 */
router.post(
  "/forgot-password",
  rateLimiter.createEndpointLimiter("forgotPassword"), // ✅ Rate limit cho forgot password
  createProxyMiddleware({
    target: config.services.userService || "http://localhost:8080",
    changeOrigin: true,
    pathRewrite: {
      "^/auth/forgot-password": "/api/auth/forgot-password",
    },
    onError: (err, req, res) => {
      console.error("❌ Forgot password proxy error:", err.message);
      res.status(503).json({
        success: false,
        error: "User service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    },
  })
);

/**
 * POST /auth/reset-password
 * Rate limited password reset confirmation
 */
router.post(
  "/reset-password",
  rateLimiter.createEndpointLimiter("forgotPassword"), // ✅ Same limit as forgot-password
  createProxyMiddleware({
    target: config.services.userService || "http://localhost:8080",
    changeOrigin: true,
    pathRewrite: {
      "^/auth/reset-password": "/api/auth/reset-password",
    },
    onError: (err, req, res) => {
      console.error("❌ Reset password proxy error:", err.message);
      res.status(503).json({
        success: false,
        error: "User service temporarily unavailable",
        code: "SERVICE_UNAVAILABLE",
      });
    },
  })
);

module.exports = router;
