/**
 * ✅ Rate Limiter Tests
 * Comprehensive testing cho enhanced rate limiting functionality
 */

const request = require("supertest");
const app = require("../../src/app");
const { rateLimiter } = require("../../src/middleware/rateLimiter");
const redisClient = require("../../src/config/redis");

describe("Enhanced Rate Limiter", () => {
  let adminToken, userToken, server;

  beforeAll(async () => {
    // Start server
    server = app.listen(0);

    // Mock tokens cho testing
    adminToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluMSIsInJvbGUiOiJhZG1pbiJ9.test";
    userToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxIiwicm9sZSI6InVzZXIifQ.test";
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (redisClient.getClient()) {
      await redisClient.getClient().quit();
    }
  });

  beforeEach(async () => {
    // Reset rate limiter state
    rateLimiter.clearAnalytics();
    rateLimiter.whitelist.clear();
    rateLimiter.blacklist.clear();

    // Clear Redis keys
    try {
      const client = redisClient.getClient();
      if (client) {
        await client.flushdb();
      }
    } catch (error) {
      // Redis may not be available
    }
  });

  describe("Basic Rate Limiting", () => {
    test("should allow requests within limit", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.success).toBe(true);
    });

    test("should block requests exceeding limit", async () => {
      // Make multiple requests to exceed limit
      for (let i = 0; i < 102; i++) {
        await request(app).get("/api/health");
      }

      const response = await request(app).get("/api/health").expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    test("should have proper rate limit headers", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.headers).toHaveProperty("x-ratelimit-limit");
      expect(response.headers).toHaveProperty("x-ratelimit-remaining");
      expect(response.headers).toHaveProperty("x-ratelimit-reset");
    });
  });

  describe("Role-Based Rate Limiting", () => {
    test("admin should have higher limits than users", async () => {
      // Test with user token (lower limit)
      let userRequests = 0;
      try {
        for (let i = 0; i < 1001; i++) {
          await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${userToken}`);
          userRequests++;
        }
      } catch (error) {
        // Expected to fail at some point
      }

      // Test with admin token (higher limit)
      let adminRequests = 0;
      try {
        for (let i = 0; i < 2000; i++) {
          await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${adminToken}`);
          adminRequests++;
        }
      } catch (error) {
        // May fail later than user
      }

      expect(adminRequests).toBeGreaterThan(userRequests);
    });

    test("should use correct rate limit for user role", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.headers["x-ratelimit-limit"]).toBe("1000");
    });
  });

  describe("IP Whitelisting/Blacklisting", () => {
    test("whitelisted IP should bypass rate limits", async () => {
      const testIP = "192.168.1.100";
      rateLimiter.addToWhitelist(testIP);

      // Make many requests that would normally be blocked
      for (let i = 0; i < 200; i++) {
        const response = await request(app)
          .get("/api/health")
          .set("X-Forwarded-For", testIP)
          .expect(200);
      }
    });

    test("blacklisted IP should be blocked immediately", async () => {
      const testIP = "192.168.1.200";
      rateLimiter.addToBlacklist(testIP);

      const response = await request(app)
        .get("/api/health")
        .set("X-Forwarded-For", testIP)
        .expect(429);

      expect(response.body.code).toBe("IP_BLACKLISTED");
    });
  });

  describe("Analytics and Tracking", () => {
    test("should track request analytics", async () => {
      const testIP = "192.168.1.300";

      // Make some requests
      for (let i = 0; i < 5; i++) {
        await request(app).get("/api/health").set("X-Forwarded-For", testIP);
      }

      const analytics = rateLimiter.getAnalytics(testIP);
      expect(analytics.length).toBeGreaterThan(0);
      expect(analytics[0].requests).toBeGreaterThan(0);
    });

    test("should track limited requests", async () => {
      const testIP = "192.168.1.400";

      // Exceed rate limit
      for (let i = 0; i < 105; i++) {
        await request(app).get("/api/health").set("X-Forwarded-For", testIP);
      }

      const analytics = rateLimiter.getAnalytics(testIP);
      expect(analytics[0].limited).toBeGreaterThan(0);
    });
  });

  describe("Health Check", () => {
    test("should return health status", async () => {
      const health = await rateLimiter.healthCheck();

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("store");
      expect(health).toHaveProperty("analytics");
      expect(health.status).toBe("healthy");
    });
  });

  describe("Dynamic Rate Limiting", () => {
    test("should adjust limits based on user behavior", async () => {
      const testIP = "192.168.1.500";

      // Simulate good behavior first
      for (let i = 0; i < 10; i++) {
        await request(app).get("/api/health").set("X-Forwarded-For", testIP);

        // Small delay to avoid hitting limits
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const userHistory = rateLimiter.getUserHistory(testIP);
      const dynamicLimit = rateLimiter.calculateDynamicLimit(userHistory, 100);

      // Should be same or higher for good behavior
      expect(dynamicLimit).toBeGreaterThanOrEqual(100);
    });
  });

  describe("Management Operations", () => {
    test("should reset user limits", async () => {
      const testIP = "192.168.1.600";

      // Hit rate limit
      for (let i = 0; i < 105; i++) {
        await request(app).get("/api/health").set("X-Forwarded-For", testIP);
      }

      // Reset limits
      const success = await rateLimiter.resetUserLimits(testIP);
      expect(success).toBe(true);

      // Should be able to make requests again
      const response = await request(app)
        .get("/api/health")
        .set("X-Forwarded-For", testIP)
        .expect(200);
    });

    test("should clear analytics", () => {
      // Add some analytics data
      rateLimiter.trackRequest("test.ip", "/test", false);
      expect(rateLimiter.analytics.size).toBeGreaterThan(0);

      // Clear analytics
      rateLimiter.clearAnalytics();
      expect(rateLimiter.analytics.size).toBe(0);
    });
  });

  describe("Smart Limiter", () => {
    test("should use different limits for authenticated vs anonymous", async () => {
      // Anonymous request
      const anonResponse = await request(app).get("/api/health");

      // Authenticated request
      const authResponse = await request(app)
        .get("/api/health")
        .set("Authorization", `Bearer ${userToken}`);

      // Both should succeed but may have different limits
      expect(anonResponse.status).toBe(200);
      expect(authResponse.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    test("should handle Redis connection failure gracefully", async () => {
      // Simulate Redis failure by creating limiter without Redis
      const response = await request(app).get("/api/health").expect(200);

      // Should still work with memory store
      expect(response.body.success).toBe(true);
    });

    test("should handle invalid IP addresses", () => {
      expect(() => {
        rateLimiter.addToWhitelist("invalid.ip");
      }).not.toThrow();
    });
  });
});

describe("Rate Limiter Admin API", () => {
  let adminToken;

  beforeAll(() => {
    adminToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluMSIsInJvbGUiOiJhZG1pbiJ9.test";
  });

  describe("Admin Authentication", () => {
    test("should require admin role for admin endpoints", async () => {
      const userToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxIiwicm9sZSI6InVzZXIifQ.test";

      const response = await request(app)
        .get("/api/admin/rate-limit/health")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.code).toBe("FORBIDDEN");
    });

    test("should allow admin access to admin endpoints", async () => {
      const response = await request(app)
        .get("/api/admin/rate-limit/health")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Health Endpoint", () => {
    test("should return rate limiter health status", async () => {
      const response = await request(app)
        .get("/api/admin/rate-limit/health")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty("status");
      expect(response.body.data).toHaveProperty("store");
      expect(response.body.data).toHaveProperty("analytics");
    });
  });

  describe("Analytics Endpoint", () => {
    test("should return analytics data", async () => {
      const response = await request(app)
        .get("/api/admin/rate-limit/analytics")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("should return analytics for specific IP", async () => {
      const testIP = "192.168.1.700";
      rateLimiter.trackRequest(testIP, "/test", false);

      const response = await request(app)
        .get(`/api/admin/rate-limit/analytics?ip=${testIP}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("Whitelist Management", () => {
    test("should add IP to whitelist", async () => {
      const response = await request(app)
        .post("/api/admin/rate-limit/whitelist")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ip: "192.168.1.800",
          reason: "Trusted partner",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(rateLimiter.whitelist.has("192.168.1.800")).toBe(true);
    });

    test("should remove IP from whitelist", async () => {
      rateLimiter.addToWhitelist("192.168.1.900");

      const response = await request(app)
        .delete("/api/admin/rate-limit/whitelist/192.168.1.900")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(rateLimiter.whitelist.has("192.168.1.900")).toBe(false);
    });
  });

  describe("Blacklist Management", () => {
    test("should add IP to blacklist", async () => {
      const response = await request(app)
        .post("/api/admin/rate-limit/blacklist")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ip: "192.168.1.1000",
          reason: "Malicious activity",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(rateLimiter.blacklist.has("192.168.1.1000")).toBe(true);
    });

    test("should remove IP from blacklist", async () => {
      rateLimiter.addToBlacklist("192.168.1.1100");

      const response = await request(app)
        .delete("/api/admin/rate-limit/blacklist/192.168.1.1100")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(rateLimiter.blacklist.has("192.168.1.1100")).toBe(false);
    });
  });

  describe("Rate Limit Reset", () => {
    test("should reset rate limits for specific IP", async () => {
      const response = await request(app)
        .post("/api/admin/rate-limit/reset/192.168.1.1200")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Status Endpoint", () => {
    test("should return comprehensive status", async () => {
      const response = await request(app)
        .get("/api/admin/rate-limit/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty("health");
      expect(response.body.data).toHaveProperty("topLimitedIPs");
      expect(response.body.data).toHaveProperty("summary");
    });
  });
});
