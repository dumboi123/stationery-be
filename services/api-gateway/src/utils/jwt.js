const jwt = require("jsonwebtoken");
const config = require("../config");

class JWTUtils {
  /**
   * Tạo Access Token
   * @param {Object} payload - User data để encode
   * @returns {String} JWT token
   */
  generateAccessToken(payload) {
    try {
      const tokenPayload = {
        ...payload,
        type: "access",
        iat: Math.floor(Date.now() / 1000),
      };

      return jwt.sign(tokenPayload, config.jwt.secret, {
        expiresIn: config.jwt.accessTokenExpiry,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithm: "HS256",
      });
    } catch (error) {
      console.error("❌ Error generating access token:", error.message);
      throw new Error("Failed to generate access token");
    }
  }

  /**
   * Tạo Refresh Token
   * @param {Object} payload - User data để encode
   * @returns {String} JWT refresh token
   */
  generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        userId: payload.userId,
        email: payload.email,
        type: "refresh",
        iat: Math.floor(Date.now() / 1000),
      };

      return jwt.sign(tokenPayload, config.jwt.secret, {
        expiresIn: config.jwt.refreshTokenExpiry,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithm: "HS256",
      });
    } catch (error) {
      console.error("❌ Error generating refresh token:", error.message);
      throw new Error("Failed to generate refresh token");
    }
  }

  /**
   * Verify và decode JWT token
   * @param {String} token - JWT token
   * @returns {Object} Decoded payload
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithms: ["HS256"],
      });

      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
      } else if (error.name === "NotBeforeError") {
        throw new Error("Token not active yet");
      } else {
        console.error("❌ JWT verification error:", error.message);
        throw new Error("Token verification failed");
      }
    }
  }

  /**
   * Decode token mà không verify (để lấy thông tin)
   * @param {String} token - JWT token
   * @returns {Object} Decoded payload
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.error("❌ JWT decode error:", error.message);
      throw new Error("Failed to decode token");
    }
  }

  /**
   * Extract token từ Authorization header
   * @param {String} authHeader - Authorization header
   * @returns {String|null} JWT token hoặc null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }

    return parts[1];
  }

  /**
   * Tạo cả access và refresh token
   * @param {Object} userPayload - User data
   * @returns {Object} { accessToken, refreshToken }
   */
  generateTokenPair(userPayload) {
    const accessToken = this.generateAccessToken(userPayload);
    const refreshToken = this.generateRefreshToken(userPayload);

    return { accessToken, refreshToken };
  }

  /**
   * Kiểm tra token có gần hết hạn không (để refresh)
   * @param {Object} decodedToken - Decoded JWT payload
   * @param {Number} thresholdMinutes - Số phút threshold (default: 5)
   * @returns {Boolean} true nếu token sắp hết hạn
   */
  isTokenNearExpiry(decodedToken, thresholdMinutes = 5) {
    if (!decodedToken.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    const threshold = thresholdMinutes * 60;

    return decodedToken.exp - now <= threshold;
  }
}

module.exports = new JWTUtils();
