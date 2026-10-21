import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Security verification for production environment
if (isProduction) {
  if (!process.env.DATABASE_URL) {
    throw new Error("FATAL: DATABASE_URL environment variable is required in production mode.");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error(
      "FATAL: JWT_SECRET must be explicitly provided in production and be at least 32 characters long."
    );
  }
}

export const ENV = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (isProduction
      ? ""
      : "gym-fitness-super-secure-dev-jwt-key-2026-minimum-32-chars!"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : ["http://localhost:3000", "http://127.0.0.1:3000"],
  UNPAID_BOOKING_TIMEOUT_MINUTES: parseInt(process.env.UNPAID_BOOKING_TIMEOUT_MINUTES || "30", 10),
  GRACE_PERIOD_DAYS: parseInt(process.env.GRACE_PERIOD_DAYS || "7", 10),

  // Philippine SMS Integration (Semaphore)
  SMS_PROVIDER: process.env.SMS_PROVIDER || "semaphore",
  SMS_API_KEY: process.env.SMS_API_KEY || "",
  SMS_SENDER_NAME: process.env.SMS_SENDER_NAME || "",
  SMS_ENABLED: process.env.SMS_ENABLED === "true",
  SMS_DEFAULT_COUNTRY_CODE: process.env.SMS_DEFAULT_COUNTRY_CODE || "63",
  SMS_DRY_RUN: process.env.SMS_DRY_RUN !== "false", // Defaults to true (safe dry-run) unless explicitly disabled
};
