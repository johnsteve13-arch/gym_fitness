import { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "../services/analytics.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

export class AnalyticsController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getOverviewMetrics();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getRevenueTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getRevenueTrends();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getAttendanceTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getAttendanceTrends();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async exportMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const csv = await AnalyticsService.exportMembersCsv();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=gym-members-export.csv");
      return res.status(200).send(csv);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
