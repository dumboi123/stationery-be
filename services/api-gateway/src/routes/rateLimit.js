/**
 * ✅ Rate Limiter Management Routes
 * Endpoints để quản lý và monitor rate limiting
 */

const express = require("express");
const { rateLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

// ✅ Middleware: Only admin can access these routes
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
      code: "FORBIDDEN",
    });
  }
  next();
};

// ✅ GET /admin/rate-limit/health - Health check
router.get("/health", requireAuth, requireAdmin, async (req, res) => {
  try {
    const health = await rateLimiter.healthCheck();
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error("Rate limiter health check failed:", error);
    res.status(500).json({
      success: false,
      error: "Health check failed",
      details: error.message,
    });
  }
});

// ✅ GET /admin/rate-limit/analytics - Lấy analytics data
router.get("/analytics", requireAuth, requireAdmin, (req, res) => {
  try {
    const { ip, top } = req.query;

    let data;
    if (ip) {
      data = rateLimiter.getAnalytics(ip);
    } else if (top) {
      data = rateLimiter.getTopLimitedIPs(parseInt(top) || 10);
    } else {
      data = rateLimiter.getAnalytics();
    }

    res.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
      details: error.message,
    });
  }
});

// ✅ POST /admin/rate-limit/whitelist - Add IP to whitelist
router.post("/whitelist", requireAuth, requireAdmin, (req, res) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: "IP address is required",
      });
    }

    rateLimiter.addToWhitelist(ip, reason);

    logger.info(
      `Admin ${req.user.id} added IP ${ip} to whitelist. Reason: ${reason}`
    );

    res.json({
      success: true,
      message: `IP ${ip} added to whitelist`,
      data: { ip, reason, addedBy: req.user.id },
    });
  } catch (error) {
    logger.error("Error adding to whitelist:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add to whitelist",
      details: error.message,
    });
  }
});

// ✅ DELETE /admin/rate-limit/whitelist/:ip - Remove IP from whitelist
router.delete("/whitelist/:ip", requireAuth, requireAdmin, (req, res) => {
  try {
    const { ip } = req.params;

    rateLimiter.removeFromWhitelist(ip);

    logger.info(`Admin ${req.user.id} removed IP ${ip} from whitelist`);

    res.json({
      success: true,
      message: `IP ${ip} removed from whitelist`,
      data: { ip, removedBy: req.user.id },
    });
  } catch (error) {
    logger.error("Error removing from whitelist:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove from whitelist",
      details: error.message,
    });
  }
});

// ✅ POST /admin/rate-limit/blacklist - Add IP to blacklist
router.post("/blacklist", requireAuth, requireAdmin, (req, res) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: "IP address is required",
      });
    }

    rateLimiter.addToBlacklist(ip, reason);

    logger.info(
      `Admin ${req.user.id} added IP ${ip} to blacklist. Reason: ${reason}`
    );

    res.json({
      success: true,
      message: `IP ${ip} added to blacklist`,
      data: { ip, reason, addedBy: req.user.id },
    });
  } catch (error) {
    logger.error("Error adding to blacklist:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add to blacklist",
      details: error.message,
    });
  }
});

// ✅ DELETE /admin/rate-limit/blacklist/:ip - Remove IP from blacklist
router.delete("/blacklist/:ip", requireAuth, requireAdmin, (req, res) => {
  try {
    const { ip } = req.params;

    rateLimiter.removeFromBlacklist(ip);

    logger.info(`Admin ${req.user.id} removed IP ${ip} from blacklist`);

    res.json({
      success: true,
      message: `IP ${ip} removed from blacklist`,
      data: { ip, removedBy: req.user.id },
    });
  } catch (error) {
    logger.error("Error removing from blacklist:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove from blacklist",
      details: error.message,
    });
  }
});

// ✅ POST /admin/rate-limit/reset/:ip - Reset limits for specific IP
router.post("/reset/:ip", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ip } = req.params;

    const success = await rateLimiter.resetUserLimits(ip);

    if (success) {
      logger.info(`Admin ${req.user.id} reset rate limits for IP ${ip}`);
      res.json({
        success: true,
        message: `Rate limits reset for IP ${ip}`,
        data: { ip, resetBy: req.user.id },
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to reset rate limits",
      });
    }
  } catch (error) {
    logger.error("Error resetting rate limits:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset rate limits",
      details: error.message,
    });
  }
});

// ✅ DELETE /admin/rate-limit/analytics - Clear analytics data
router.delete("/analytics", requireAuth, requireAdmin, (req, res) => {
  try {
    rateLimiter.clearAnalytics();

    logger.info(`Admin ${req.user.id} cleared rate limit analytics`);

    res.json({
      success: true,
      message: "Analytics data cleared",
      data: { clearedBy: req.user.id, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logger.error("Error clearing analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear analytics",
      details: error.message,
    });
  }
});

// ✅ GET /admin/rate-limit/status - Overall rate limiting status
router.get("/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const health = await rateLimiter.healthCheck();
    const topLimited = rateLimiter.getTopLimitedIPs(5);

    res.json({
      success: true,
      data: {
        health,
        topLimitedIPs: topLimited,
        summary: {
          whitelistedCount: health.analytics.whitelistedIPs,
          blacklistedCount: health.analytics.blacklistedIPs,
          totalTracked: health.analytics.totalTracked,
          storeType: health.store.type,
          isRedisConnected: health.store.connected,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error fetching rate limit status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch status",
      details: error.message,
    });
  }
});

module.exports = router;
