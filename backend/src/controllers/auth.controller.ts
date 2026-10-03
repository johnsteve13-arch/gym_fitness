import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      await recordAuditLog(req, "USER_REGISTERED", "users", result.user.id, { email: result.user.email, role: result.user.role });
      return sendSuccess(res, result, "Account registered successfully", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, "Email and password are required.", 400);
      }
      const result = await AuthService.login(email, password);
      await recordAuditLog(req, "USER_LOGIN", "users", result.user.id, { email: result.user.email });
      return sendSuccess(res, result, "Login successful");
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, "Unauthorized", 401);
      const profile = await AuthService.getProfile(req.user.id);
      return sendSuccess(res, profile);
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, "Unauthorized", 401);
      const updated = await AuthService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, updated, "Profile updated successfully");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
