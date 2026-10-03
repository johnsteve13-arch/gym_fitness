import app from "./app";
import { ENV } from "./config/env";
import { connectDatabase } from "./config/database";
import { logger } from "./utils/logger";

const server = app.listen(ENV.PORT, async () => {
  logger.info(`=======================================================`);
  logger.info(` APEX IRON FITNESS PLATFORM — PRODUCTION REST API`);
  logger.info(` Server running on port: ${ENV.PORT}`);
  logger.info(` Environment: ${ENV.NODE_ENV}`);
  logger.info(` Health endpoint: http://localhost:${ENV.PORT}/health`);
  logger.info(` API Base URL: http://localhost:${ENV.PORT}/api`);
  logger.info(`=======================================================`);

  await connectDatabase();
});

// Graceful Shutdown
const handleShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

export default server;
