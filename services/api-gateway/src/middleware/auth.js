const jwtUtils = require("../utils/jwt");
const redisClient = require("../config/redis");

class AuthMiddleware {
  /**
   * Middleware yêu cầu authentication
   */
  requireAuth = async (req, res, next) => {
    try {
      // Extract token từ header
      const authHeader = req.headers.authorization;
      const token = jwtUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: "Access token is required",
          code: "TOKEN_MISSING",
        });
      }

      // Verify token
      const decoded = jwtUtils.verifyToken(token);

      // Kiểm tra token type
      if (decoded.type !== "access") {
        return res.status(401).json({
          success: false,
          error: "Invalid token type",
          code: "INVALID_TOKEN_TYPE",
        });
      }

      // Kiểm tra token có bị blacklist không (logout)
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          error: "Token has been revoked",
          code: "TOKEN_REVOKED",
        });
      }

      // Attach user info vào request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        tokenId: decoded.jti,
        issuedAt: decoded.iat,
        expiresAt: decoded.exp,
      };

      // Set auth header để forward đến services khác
      req.headers["x-user-id"] = decoded.userId;
      req.headers["x-user-email"] = decoded.email;
      req.headers["x-user-role"] = decoded.role;

      next();
    } catch (error) {
      console.error("🔐 Auth middleware error:", error.message);

      return res.status(401).json({
        success: false,
        error: error.message,
        code: "AUTHENTICATION_FAILED",
      });
    }
  };

  /**
   * Middleware authentication tùy chọn (không bắt buộc)
   */
  optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = jwtUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        // Không có token, nhưng vẫn tiếp tục
        return next();
      }

      // Có token thì verify
      const decoded = jwtUtils.verifyToken(token);

      if (decoded.type === "access") {
        const isBlacklisted = await this.isTokenBlacklisted(token);

        if (!isBlacklisted) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            permissions: decoded.permissions || [],
          };

          req.headers["x-user-id"] = decoded.userId;
          req.headers["x-user-email"] = decoded.email;
          req.headers["x-user-role"] = decoded.role;
        }
      }
    } catch (error) {
      console.error("🔐 Optional auth error:", error.message);
      // Lỗi auth nhưng vẫn tiếp tục (optional)
    }

    next();
  };

  /**
   * Middleware kiểm tra role
   * @param {Array} allowedRoles - Danh sách roles được phép
   */
  requireRole = (allowedRoles = []) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      next();
    };
  };

  /**
   * Middleware kiểm tra permissions
   * @param {Array} requiredPermissions - Permissions cần thiết
   */
  requirePermissions = (requiredPermissions = []) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      const userPermissions = req.user.permissions || [];

      const hasAllPermissions = requiredPermissions.every((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permissions: ${requiredPermissions.join(
            ", "
          )}`,
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      next();
    };
  };

  /**
   * Kiểm tra token có bị blacklist không
   * @param {String} token - JWT token
   * @returns {Boolean}
   */
  async isTokenBlacklisted(token) {
    try {
      const blacklistKey = `blacklist:${token}`;
      const result = await redisClient.get(blacklistKey);
      return result !== null;
    } catch (error) {
      console.error("❌ Error checking token blacklist:", error.message);
      // Nếu Redis lỗi, coi như token valid để không block user
      return false;
    }
  }

  /**
   * Blacklist token (dùng khi logout)
   * @param {String} token - JWT token
   * @param {Number} expireInSeconds - Thời gian expire
   */
  async blacklistToken(token, expireInSeconds = null) {
    try {
      const blacklistKey = `blacklist:${token}`;

      if (expireInSeconds) {
        await redisClient.set(blacklistKey, "revoked", expireInSeconds);
      } else {
        // Tự động expire dựa trên token expiry
        const decoded = jwtUtils.decodeToken(token);
        const now = Math.floor(Date.now() / 1000);
        const timeToExpire = decoded.exp - now;

        if (timeToExpire > 0) {
          await redisClient.set(blacklistKey, "revoked", timeToExpire);
        }
      }
    } catch (error) {
      console.error("❌ Error blacklisting token:", error.message);
      throw error;
    }
  }
}

// Export both instance and individual methods
const authMiddleware = new AuthMiddleware();

module.exports = {
  requireAuth: authMiddleware.requireAuth,
  optionalAuth: authMiddleware.optionalAuth,
  requireRole: authMiddleware.requireRole,
  requirePermissions: authMiddleware.requirePermissions,
  blacklistToken: authMiddleware.blacklistToken,
  // Also export the instance
  authMiddleware,
};
