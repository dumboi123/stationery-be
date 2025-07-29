const Redis = require("redis");
const config = require("./index");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
  }

  async connect() {
    try {
      console.log("🔄 Attempting to connect to Redis...");
      console.log(`📍 Redis config: ${config.redis.host}:${config.redis.port}`);

      const redisUrl = `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}/${config.redis.db}`;
      console.log(
        `🔗 Connecting to: ${redisUrl.replace(/:([^:@]+)@/, ":***@")}`
      );

      this.client = Redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: config.redis.connectTimeout || 10000,
          commandTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              console.error(
                `❌ Redis max retries (${this.maxRetries}) exceeded`
              );
              return false;
            }
            console.log(`🔄 Redis retry attempt ${retries}/${this.maxRetries}`);
            return Math.min(retries * 1000, 5000);
          },
        },
      });

      // Event listeners
      this.client.on("connect", () => {
        console.log("🔗 Redis connecting...");
      });

      this.client.on("ready", () => {
        console.log("✅ Redis connected successfully");
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on("error", (err) => {
        console.error("❌ Redis connection error:", err.message);
        this.isConnected = false;
      });

      this.client.on("end", () => {
        console.log("📡 Redis connection ended");
        this.isConnected = false;
      });

      this.client.on("reconnecting", () => {
        console.log("🔄 Redis reconnecting...");
      });

      // ✅ Connect với timeout
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Redis connection timeout after 15s")),
            15000
          )
        ),
      ]);

      // ✅ Test connection
      const pingResult = await this.client.ping();
      console.log("🏓 Redis ping successful:", pingResult);

      return this.client;
    } catch (error) {
      this.connectionAttempts++;
      console.error(
        `❌ Failed to connect to Redis (attempt ${this.connectionAttempts}):`,
        error.message
      );

      // ✅ Graceful fallback - KHÔNG throw error
      this.isConnected = false;
      this.client = null;

      if (this.connectionAttempts >= this.maxRetries) {
        console.warn(
          "⚠️ Redis connection failed after max retries. Running without Redis cache."
        );
      }

      return null; // ✅ Return null thay vì throw
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log("👋 Redis disconnected gracefully");
      } catch (error) {
        console.error("❌ Error disconnecting Redis:", error.message);
        // Force disconnect
        if (this.client) {
          this.client.disconnect();
        }
      }
    }
  }

  getClient() {
    // ✅ Return null thay vì throw error
    if (!this.isConnected || !this.client) {
      console.warn("⚠️ Redis client not connected");
      return null;
    }
    return this.client;
  }

  // ✅ Helper methods với graceful fallback
  async set(key, value, expireInSeconds = null) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn(`⚠️ Cannot SET ${key} - Redis not connected`);
        return false;
      }

      if (expireInSeconds) {
        await client.setEx(key, expireInSeconds, JSON.stringify(value));
      } else {
        await client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error("Redis SET error:", error.message);
      return false;
    }
  }

  async get(key) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn(`⚠️ Cannot GET ${key} - Redis not connected`);
        return null;
      }

      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Redis GET error:", error.message);
      return null;
    }
  }

  async del(key) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn(`⚠️ Cannot DELETE ${key} - Redis not connected`);
        return false;
      }

      await client.del(key);
      return true;
    } catch (error) {
      console.error("Redis DEL error:", error.message);
      return false;
    }
  }

  // ✅ Method để check health
  async isHealthy() {
    try {
      const client = this.getClient();
      if (!client) return false;

      await client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
