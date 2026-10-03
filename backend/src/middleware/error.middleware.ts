import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { sendError } from "../utils/apiResponse";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Unhandled Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error. Please try again later."
      : err.message || "An unexpected error occurred.";

  return sendError(res, message, statusCode, err.errors || undefined);
};
