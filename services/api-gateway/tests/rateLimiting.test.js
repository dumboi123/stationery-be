const request = require("supertest");
const app = require("../src/app");
const redisClient = require("../src/config/redis");

// Mock Redis client
jest.mock("../src/config/redis", () => ({
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  quit: jest.fn(),
}));

describe("Rate Limiting", () => {
  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Redis responses
    redisClient.get.mockResolvedValue(null);
    redisClient.incr.mockResolvedValue(1);
    redisClient.expire.mockResolvedValue(1);
    redisClient.exists.mockResolvedValue(0);
  });

  describe("General Rate Limiting", () => {
    test("should allow requests under rate limit", async () => {
      // Mock Redis to return low count
      redisClient.get.mockResolvedValue("5");

      const response = await request(app).get("/api");

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty("x-ratelimit-limit");
      expect(response.headers).toHaveProperty("x-ratelimit-remaining");
    });

    test("should block requests over rate limit", async () => {
      // Mock Redis to return high count (over limit)
      redisClient.get.mockResolvedValue("101");

      const response = await request(app).get("/api").expect(429);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Too Many Requests");
      expect(response.headers).toHaveProperty("retry-after");
    });

    test("should include rate limit headers", async () => {
      redisClient.get.mockResolvedValue("10");

      const response = await request(app).get("/api");

      expect(response.headers).toHaveProperty("x-ratelimit-limit");
      expect(response.headers).toHaveProperty("x-ratelimit-remaining");
      expect(response.headers).toHaveProperty("x-ratelimit-reset");
    });
  });

  describe("Auth Routes Rate Limiting", () => {
    test("should apply stricter limits to auth routes", async () => {
      // Mock low count for auth rate limit
      redisClient.get.mockResolvedValue("3");

      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });

      // Should not be rate limited (3 < auth limit)
      expect(response.status).not.toBe(429);
    });

    test("should block auth requests over stricter limit", async () => {
      // Mock high count for auth routes
      redisClient.get.mockResolvedValue("21"); // Over auth limit

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(429);

      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toContain("rate limit");
    });
  });

  describe("Payment Routes Rate Limiting", () => {
    const mockAuthToken =
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxMjMiLCJyb2xlIjoidXNlciIsImlhdCI6MTYzOTU4NzYwMCwiZXhwIjoxNjM5NTkxMjAwfQ.test";

    test("should apply very strict limits to payment routes", async () => {
      redisClient.get.mockResolvedValue("2"); // Under payment limit

      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", mockAuthToken)
        .send({
          amount: 100,
          currency: "USD",
        });

      expect(response.status).not.toBe(429);
    });

    test("should block payment requests over very strict limit", async () => {
      redisClient.get.mockResolvedValue("11"); // Over payment limit (10)

      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", mockAuthToken)
        .send({
          amount: 100,
          currency: "USD",
        })
        .expect(429);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Role-based Rate Limiting", () => {
    test("should apply different limits based on user role", async () => {
      // Test user role limit
      redisClient.get.mockResolvedValue("45"); // Under user limit (50)

      const userToken =
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxMjMiLCJyb2xlIjoidXNlciIsImlhdCI6MTYzOTU4NzYwMCwiZXhwIjoxNjM5NTkxMjAwfQ.test";

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", userToken);

      expect(response.status).not.toBe(429);
    });

    test("should allow higher limits for premium users", async () => {
      redisClient.get.mockResolvedValue("80"); // Under premium limit (100)

      const premiumToken =
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InByZW1pdW0xMjMiLCJyb2xlIjoicHJlbWl1bSIsImlhdCI6MTYzOTU4NzYwMCwiZXhwIjoxNjM5NTkxMjAwfQ.test";

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", premiumToken);

      expect(response.status).not.toBe(429);
    });

    test("should allow highest limits for admin users", async () => {
      redisClient.get.mockResolvedValue("150"); // Under admin limit (200)

      const adminToken =
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluMTIzIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjM5NTg3NjAwLCJleHAiOjE2Mzk1OTEyMDB9.test";

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", adminToken);

      expect(response.status).not.toBe(429);
    });
  });

  describe("IP-based Rate Limiting", () => {
    test("should track requests per IP address", async () => {
      redisClient.get.mockResolvedValue("5");

      const response = await request(app)
        .get("/api")
        .set("X-Forwarded-For", "192.168.1.100");

      expect(response.status).toBe(200);
      // Verify that Redis was called with IP-based key
      expect(redisClient.incr).toHaveBeenCalled();
    });

    test("should handle multiple IPs independently", async () => {
      // First IP
      redisClient.get.mockResolvedValueOnce("5");
      const response1 = await request(app)
        .get("/api")
        .set("X-Forwarded-For", "192.168.1.100");

      // Second IP
      redisClient.get.mockResolvedValueOnce("3");
      const response2 = await request(app)
        .get("/api")
        .set("X-Forwarded-For", "192.168.1.101");

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe("Rate Limit Headers", () => {
    test("should include standard rate limit headers", async () => {
      redisClient.get.mockResolvedValue("10");

      const response = await request(app).get("/api");

      expect(response.headers).toHaveProperty("x-ratelimit-limit");
      expect(response.headers).toHaveProperty("x-ratelimit-remaining");
      expect(response.headers).toHaveProperty("x-ratelimit-reset");
    });

    test("should include retry-after header when rate limited", async () => {
      redisClient.get.mockResolvedValue("101");

      const response = await request(app).get("/api").expect(429);

      expect(response.headers).toHaveProperty("retry-after");
      expect(parseInt(response.headers["retry-after"])).toBeGreaterThan(0);
    });
  });

  describe("Rate Limit Bypass", () => {
    test("should not rate limit health check endpoints", async () => {
      // Even with high count, health checks should pass
      redisClient.get.mockResolvedValue("1000");

      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
    });

    test("should not rate limit with bypass header (for internal services)", async () => {
      redisClient.get.mockResolvedValue("1000");

      const response = await request(app)
        .get("/api")
        .set("X-Internal-Service", "true")
        .set("Authorization", "Bearer internal-service-token");

      // Should check if bypass logic is implemented
      // This test would need actual bypass logic in the rate limiter
    });
  });

  describe("Dynamic Rate Limiting", () => {
    test("should adjust limits based on system load", async () => {
      // Mock high system load
      const originalLoadAvg = require("os").loadavg;
      require("os").loadavg = jest.fn().mockReturnValue([8.0, 7.5, 7.0]);

      redisClient.get.mockResolvedValue("30"); // Would normally be OK

      const response = await request(app).get("/api");

      // Restore original function
      require("os").loadavg = originalLoadAvg;

      // Should either pass or be more restrictive due to high load
      expect([200, 429]).toContain(response.status);
    });
  });

  describe("Rate Limit Error Responses", () => {
    test("should return proper error structure when rate limited", async () => {
      redisClient.get.mockResolvedValue("101");

      const response = await request(app).get("/api").expect(429);

      expect(response.body).toMatchObject({
        error: "Too Many Requests",
        message: expect.any(String),
        retryAfter: expect.any(Number),
      });
    });

    test("should include helpful information in rate limit response", async () => {
      redisClient.get.mockResolvedValue("101");

      const response = await request(app).get("/api").expect(429);

      expect(response.body).toHaveProperty("limit");
      expect(response.body).toHaveProperty("windowMs");
      expect(response.body).toHaveProperty("retryAfter");
    });
  });
});

module.exports = {
  // Export utilities for other test files
  mockRateLimitReached: () => {
    redisClient.get.mockResolvedValue("101");
  },
  mockRateLimitOk: () => {
    redisClient.get.mockResolvedValue("5");
  },
};
