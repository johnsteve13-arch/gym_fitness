import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";
import { sendError } from "../utils/apiResponse";

interface JwtPayload {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "trainer" | "member";
  firstName: string;
  lastName: string;
  memberId?: string;
  trainerId?: string;
  status: "active" | "suspended" | "inactive";
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Access denied. No authentication token provided.", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;

    if (decoded.status === "suspended") {
      return sendError(res, "Account is suspended. Please contact gym administration.", 403);
    }
    if (decoded.status === "inactive") {
      return sendError(res, "Account is inactive. Please reactivate your account.", 403);
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    return sendError(res, "Invalid or expired session token.", 401);
  }
};
