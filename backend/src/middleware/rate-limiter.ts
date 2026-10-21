import rateLimit from "express-rate-limit";

// Rate Limiting: General API Limiter (500 req/15min)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// Dedicated Rate Limiting for Authentication (Brute-force protection: 20 attempts/15min)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

// Dedicated Rate Limiting for Booking Creation (Race-condition & spam protection: 60 req/15min)
export const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    error: "Booking request limit reached. Please wait before creating additional sessions.",
  },
});

// Dedicated Rate Limiting for SMS Dispatching (Abuse prevention: 30 req/15min)
export const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    error: "SMS dispatch limit reached. Please wait before attempting further notifications.",
  },
});
