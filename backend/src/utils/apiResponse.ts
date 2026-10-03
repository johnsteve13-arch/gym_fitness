import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message: string = "Operation successful",
  statusCode: number = 200,
  meta?: ApiResponse["meta"]
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

export const sendError = (
  res: Response,
  error: string = "Internal server error",
  statusCode: number = 500,
  errors?: any
) => {
  return res.status(statusCode).json({
    success: false,
    error,
    errors,
  });
};
