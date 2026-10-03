import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/gym_fitness",
  JWT_SECRET: process.env.JWT_SECRET || "gym-fitness-super-secure-production-jwt-token-key-2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:3000"],
  UNPAID_BOOKING_TIMEOUT_MINUTES: parseInt(process.env.UNPAID_BOOKING_TIMEOUT_MINUTES || "30", 10),
  GRACE_PERIOD_DAYS: parseInt(process.env.GRACE_PERIOD_DAYS || "7", 10),
};
