import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully (TiDB / MySQL).");
    return true;
  } catch (error: any) {
    logger.warn(`Database connection failed: ${error.message}. Operating in fallback/in-memory mode for development.`);
    return false;
  }
}
