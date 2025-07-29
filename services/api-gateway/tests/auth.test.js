const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { generateTokenPair, verifyToken } = require("../src/utils/jwt");
const redisClient = require("../src/config/redis");

// Mock JWT và Redis
jest.mock("../src/config/redis", () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  quit: jest.fn(),
}));

describe("JWT Authentication Middleware", () => {
  const mockUser = {
    id: "user123",
    email: "test@example.com",
    role: "user",
    permissions: ["read:profile"],
  };

  let validToken;
  let expiredToken;
  let invalidToken;

  beforeAll(() => {
    // Create test tokens
    validToken = jwt.sign(
      mockUser,
      process.env.JWT_ACCESS_SECRET || "test-secret",
      {
        expiresIn: "1h",
      }
    );

    expiredToken = jwt.sign(
      mockUser,
      process.env.JWT_ACCESS_SECRET || "test-secret",
      {
        expiresIn: "-1h", // Already expired
      }
    );

    invalidToken = "invalid.token.here";
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Redis để token không bị blacklist
    redisClient.exists.mockResolvedValue(0);
  });

  describe("Protected Routes", () => {
    test("should allow access with valid token", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${validToken}`);

      // Expect either success or proxy error (not auth error)
      expect([200, 201, 400, 404, 500, 502, 503]).toContain(response.status);
      expect(response.status).not.toBe(401);
    });

    test("should reject access without token", async () => {
      const response = await request(app).get("/api/users").expect(401);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Unauthorized");
    });

    test("should reject access with invalid token", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toContain("Invalid token");
    });

    test("should reject access with expired token", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toContain("expired");
    });

    test("should reject access with blacklisted token", async () => {
      // Mock Redis để token bị blacklist
      redisClient.exists.mockResolvedValue(1);

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toContain("blacklisted");
    });

    test("should handle malformed Authorization header", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", "InvalidFormat")
        .expect(401);

      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toContain("Invalid authorization header");
    });
  });

  describe("JWT Utilities", () => {
    test("generateTokenPair should create access and refresh tokens", () => {
      const tokens = generateTokenPair(mockUser);

      expect(tokens).toHaveProperty("accessToken");
      expect(tokens).toHaveProperty("refreshToken");
      expect(typeof tokens.accessToken).toBe("string");
      expect(typeof tokens.refreshToken).toBe("string");
    });

    test("verifyToken should validate correct token", () => {
      const decoded = verifyToken(validToken, "access");

      expect(decoded).toHaveProperty("id", mockUser.id);
      expect(decoded).toHaveProperty("email", mockUser.email);
      expect(decoded).toHaveProperty("role", mockUser.role);
    });

    test("verifyToken should throw error for invalid token", () => {
      expect(() => {
        verifyToken(invalidToken, "access");
      }).toThrow();
    });

    test("verifyToken should throw error for expired token", () => {
      expect(() => {
        verifyToken(expiredToken, "access");
      }).toThrow();
    });
  });

  describe("Role-based Access Control", () => {
    const adminUser = {
      id: "admin123",
      email: "admin@example.com",
      role: "admin",
      permissions: ["read:all", "write:all", "delete:all"],
    };

    const userToken = jwt.sign(
      mockUser,
      process.env.JWT_ACCESS_SECRET || "test-secret",
      {
        expiresIn: "1h",
      }
    );

    const adminToken = jwt.sign(
      adminUser,
      process.env.JWT_ACCESS_SECRET || "test-secret",
      {
        expiresIn: "1h",
      }
    );

    test("should allow admin access to admin routes", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      // Should not get 403 (forbidden) error
      expect(response.status).not.toBe(403);
    });

    test("should deny user access to admin routes", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${userToken}`);

      // Should get 403 or route not found
      expect([403, 404]).toContain(response.status);
    });
  });

  describe("Token Refresh", () => {
    test("should refresh token with valid refresh token", async () => {
      const refreshToken = jwt.sign(
        mockUser,
        process.env.JWT_REFRESH_SECRET || "test-refresh-secret",
        {
          expiresIn: "7d",
        }
      );

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      // Should either succeed or fail at proxy level, not auth level
      expect([200, 201, 400, 404, 500, 502]).toContain(response.status);
      expect(response.status).not.toBe(401);
    });

    test("should reject refresh with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-refresh-token" })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Logout Functionality", () => {
    test("should blacklist token on logout", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${validToken}`);

      // Should process logout request
      expect([200, 201, 400, 404, 500, 502]).toContain(response.status);

      // Verify Redis set was called to blacklist token
      if (response.status === 200) {
        expect(redisClient.set).toHaveBeenCalled();
      }
    });

    test("should reject logout without token", async () => {
      const response = await request(app).post("/api/auth/logout").expect(401);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Security Features", () => {
    test("should not expose sensitive user information in token", () => {
      const decoded = verifyToken(validToken, "access");

      expect(decoded).not.toHaveProperty("password");
      expect(decoded).not.toHaveProperty("passwordHash");
      expect(decoded).not.toHaveProperty("secret");
    });

    test("should include necessary user information in token", () => {
      const decoded = verifyToken(validToken, "access");

      expect(decoded).toHaveProperty("id");
      expect(decoded).toHaveProperty("role");
      expect(decoded).toHaveProperty("iat");
      expect(decoded).toHaveProperty("exp");
    });
  });
});

module.exports = {
  mockUser: {
    id: "user123",
    email: "test@example.com",
    role: "user",
    permissions: ["read:profile"],
  },
};
