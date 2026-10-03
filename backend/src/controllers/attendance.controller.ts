import { Request, Response, NextFunction } from "express";
import { AttendanceService } from "../services/attendance.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class AttendanceController {
  static async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, method, notes } = req.body;
      if (!identifier) {
        return sendError(res, "QR code or Member ID identifier is required.", 400);
      }

      const result = await AttendanceService.verifyAndCheckIn({
        identifier,
        method: method || "qr",
        staffId: req.user?.id,
        notes,
      });

      if (!result.accessGranted) {
        return sendError(res, result.reason || "Access denied.", 403, result);
      }

      await recordAuditLog(req, "ATTENDANCE_CHECK_IN", "attendances", result.attendance?.id, {
        memberId: result.member?.id,
        method: result.attendance?.checkInMethod,
      });

      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { memberId, attendanceId } = req.body;
      const targetMemberId = memberId || req.user?.memberId;
      if (!targetMemberId && !attendanceId) {
        return sendError(res, "Member ID or Attendance ID is required to check out.", 400);
      }

      const result = await AttendanceService.checkOut({
        memberId: targetMemberId,
        attendanceId,
      });

      await recordAuditLog(req, "ATTENDANCE_CHECK_OUT", "attendances", result.attendance.id, {
        durationMinutes: result.durationMinutes,
      });

      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const memberId = (req.query.memberId as string) || (req.user?.role === "member" ? req.user.memberId : undefined);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const result = await AttendanceService.getAttendanceHistory({ memberId, startDate, endDate, page, limit });
      return sendSuccess(res, result.records, "Attendance history retrieved", 200, result.meta);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async peakHours(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AttendanceService.getPeakHoursAnalysis();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
