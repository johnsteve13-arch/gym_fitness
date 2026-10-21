import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { ENV } from "./config/env";
import { prisma } from "./config/database";
import { apiLimiter } from "./middleware/rate-limiter";

const app = express();

// Security Headers
app.use(helmet());

// CORS configuration with production origin enforcement
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, kiosk, curl)
      if (!origin) {
        return callback(null, true);
      }
      // Permissive in dev/staging to prevent local friction
      if (ENV.NODE_ENV !== "production") {
        return callback(null, true);
      }
      // Strict in production
      if (ENV.CORS_ORIGIN.includes(origin) || ENV.CORS_ORIGIN.includes("*")) {
        return callback(null, true);
      }
      return callback(
        new Error(`CORS policy: Origin '${origin}' is not allowed to access this resource.`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Idempotency-Key"],
  })
);

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate Limiting: General API Limiter (500 req/15min)
app.use("/api", apiLimiter);

// Lightweight Health Check for Render & Vercel
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "gym-fitness-api",
    version: "1.0.0",
  });
});

// Readiness Probe checking live database connectivity
app.get("/ready", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ready",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "gym-fitness-api",
    });
  } catch (err: any) {
    res.status(503).json({
      status: "not_ready",
      database: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Master API Routes
app.use("/api", routes);

// 404 Route Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
