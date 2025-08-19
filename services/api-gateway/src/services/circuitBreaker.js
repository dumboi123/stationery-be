const CircuitBreaker = require("opossum");
const logger = require("../utils/logger");

class CircuitBreakerService {
  constructor() {
    this.breakers = new Map();
  }

  createBreaker(name, asyncFunction, options = {}) {
    const defaultOptions = {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 60000,
      rollingCountBuckets: 10,
      name: name,
    };

    const breaker = new CircuitBreaker(asyncFunction, {
      ...defaultOptions,
      ...options,
    });

    // Event handlers
    breaker.on("open", () => {
      logger.error(`Circuit breaker OPENED: ${name}`);
    });

    breaker.on("halfOpen", () => {
      logger.warn(`Circuit breaker HALF-OPEN: ${name}`);
    });

    breaker.on("close", () => {
      logger.info(`Circuit breaker CLOSED: ${name}`);
    });

    this.breakers.set(name, breaker);
    return breaker;
  }

  getBreaker(name) {
    return this.breakers.get(name);
  }

  getStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers.entries()) {
      status[name] = {
        state: breaker.state,
        stats: breaker.stats,
      };
    }
    return status;
  }
}

module.exports = new CircuitBreakerService();
