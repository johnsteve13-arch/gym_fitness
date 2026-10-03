import { Request, Response, NextFunction } from "express";
import { ClassService } from "../services/class.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class ClassController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string;
      const scheduleDate = req.query.scheduleDate as string;
      const classes = await ClassService.listClasses({ category, scheduleDate });
      return sendSuccess(res, classes);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const gymClass = await ClassService.createClass(req.body);
      await recordAuditLog(req, "GYM_CLASS_CREATED", "gym_classes", gymClass.id, { name: gymClass.name });
      return sendSuccess(res, gymClass, "Group class scheduled successfully", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async book(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const booking = await ClassService.bookClass(req.params.id, memberId);
      await recordAuditLog(req, "CLASS_BOOKED", "class_bookings", booking.id, {
        classId: req.params.id,
        status: booking.status,
      });

      return sendSuccess(
        res,
        booking,
        booking.status === "booked" ? "Class spot confirmed!" : `Class is full. Added to waitlist at #${booking.waitlistPosition}.`,
        201
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const result = await ClassService.cancelClassBooking(req.params.id, memberId);
      await recordAuditLog(req, "CLASS_BOOKING_CANCELLED", "class_bookings", req.params.id, { memberId });
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
