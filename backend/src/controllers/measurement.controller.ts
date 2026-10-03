import { Request, Response, NextFunction } from "express";
import { MeasurementService } from "../services/measurement.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class MeasurementController {
  static async record(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const measurement = await MeasurementService.recordMeasurement({
        ...req.body,
        memberId,
        recordedByUserId: req.user?.id,
      });

      await recordAuditLog(req, "BODY_MEASUREMENT_RECORDED", "body_measurements", measurement.id, {
        weightKg: measurement.weightKg,
        bmi: measurement.bmi,
      });

      return sendSuccess(res, measurement, "Body measurements recorded successfully", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = (req.query.memberId as string) || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const data = await MeasurementService.getMemberMeasurements(memberId);
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
