const app = require("./app");
const config = require("./config");

const PORT = config.port || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log("🐳 Docker Environment Check:");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("REDIS_HOST:", process.env.REDIS_HOST);
  console.log("REDIS_PORT:", process.env.REDIS_PORT);
});

// Kết thuc tiến trình khi nhận tín hiệu dừng
// Điều này giúp đảm bảo rằng server sẽ dừng một cách an toàn và không có kết nối nào bị bỏ lỡ
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close((err) => {
      if (err) {
        console.error("Error shutting down:", err);
        process.exit(1);
      }
      console.log("Server closed gracefully");
      process.exit(0);
    });
  });
});

module.exports = server;
