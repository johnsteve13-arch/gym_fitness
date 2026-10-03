import { Request, Response, NextFunction } from "express";
import { AiService } from "../services/ai.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

export class AiController {
  static async calculateScore(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.params.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const scoreData = await AiService.calculateActivityScore(memberId);
      return sendSuccess(res, scoreData, "Member activity score computed");
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getRetentionAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await AiService.getRetentionAlerts();
      return sendSuccess(res, alerts);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getCoachAdvice(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const advice = await AiService.generateCoachAdvice({
        memberId,
        userQuery: req.body.query,
        focusArea: req.body.focusArea,
      });

      return sendSuccess(res, advice);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
