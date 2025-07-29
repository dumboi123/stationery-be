// Test setup file
const { jest } = require("@jest/globals");

// Set up environment variables for testing
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.REDIS_URL = "redis://localhost:6379";

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  // Uncomment below to suppress console logs during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Clean up function
afterAll(async () => {
  // Close any open connections
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

// Global error handler for tests
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Helper function to create delay
global.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Redis client globally if needed
jest.mock("../src/config/redis", () => ({
  ping: jest.fn().mockResolvedValue("PONG"),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  quit: jest.fn().mockResolvedValue("OK"),
}));
