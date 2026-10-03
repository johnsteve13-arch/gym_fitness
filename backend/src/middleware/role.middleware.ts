import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/apiResponse";

export const authorize = (allowedRoles: ("super_admin" | "admin" | "trainer" | "member")[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Authentication required.", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access forbidden. Required role: [${allowedRoles.join(", ")}], but your role is ${req.user.role}.`,
        403
      );
    }

    next();
  };
};

export const isStaffOrAdmin = authorize(["super_admin", "admin"]);
export const isTrainer = authorize(["trainer", "super_admin", "admin"]);
export const isMember = authorize(["member", "super_admin", "admin"]);
export const isSuperAdmin = authorize(["super_admin"]);
