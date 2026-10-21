import { Request, Response } from "express";
import { SmsService } from "../services/sms.service";
import { prisma } from "../config/database";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class SmsController {
  /**
   * Retrieves overall SMS statistics and health
   */
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await SmsService.getSmsStats();
      return sendSuccess(res, stats);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Retrieves paginated list of SMS notification logs
   */
  static async listLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string || "1", 10);
      const limit = parseInt(req.query.limit as string || "20", 10);
      const status = req.query.status as string;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [total, logs] = await Promise.all([
        prisma.smsNotificationLog.count({ where }),
        prisma.smsNotificationLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        }),
      ]);

      return sendSuccess(res, {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Retries sending a failed SMS log
   */
  static async retry(req: Request, res: Response) {
    try {
      const logId = req.params.id;
      const result = await SmsService.retrySms(logId);

      await recordAuditLog(req, "SMS_RETRY_TRIGGERED", "sms_notification_logs", logId, {
        resultStatus: result.status,
      });

      return sendSuccess(res, result, "SMS retry initiated.");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  /**
   * Admin test SMS dispatch
   */
  static async testSend(req: Request, res: Response) {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return sendError(res, "Phone number and test message are required.", 400);
      }

      const result = await SmsService.sendSms({
        toPhone: phone,
        recipientUserId: req.user?.id,
        recipientName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : "Apex Admin",
        event: "custom_admin",
        messageContent: message,
        idempotencyKey: `test_${Date.now()}`,
      });

      await recordAuditLog(req, "SMS_TEST_SENT", "sms_notification_logs", result.logId, {
        recipient: phone,
        status: result.status,
      });

      return sendSuccess(res, result, "Test SMS processed.");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  /**
   * Gets current user notification preferences
   */
  static async getPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, "User ID required.", 401);

      let pref = await prisma.userNotificationPreference.findUnique({
        where: { userId },
      });

      if (!pref) {
        pref = await prisma.userNotificationPreference.create({
          data: { userId },
        });
      }

      return sendSuccess(res, pref);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  /**
   * Updates current user notification preferences
   */
  static async updatePreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, "User ID required.", 401);

      const { smsEnabled, bookingSms, paymentSms, membershipSms, classSms, reminderSms } = req.body;

      const updated = await prisma.userNotificationPreference.upsert({
        where: { userId },
        update: {
          ...(smsEnabled !== undefined && { smsEnabled }),
          ...(bookingSms !== undefined && { bookingSms }),
          ...(paymentSms !== undefined && { paymentSms }),
          ...(membershipSms !== undefined && { membershipSms }),
          ...(classSms !== undefined && { classSms }),
          ...(reminderSms !== undefined && { reminderSms }),
        },
        create: {
          userId,
          ...(smsEnabled !== undefined && { smsEnabled }),
          ...(bookingSms !== undefined && { bookingSms }),
          ...(paymentSms !== undefined && { paymentSms }),
          ...(membershipSms !== undefined && { membershipSms }),
          ...(classSms !== undefined && { classSms }),
          ...(reminderSms !== undefined && { reminderSms }),
        },
      });

      return sendSuccess(res, updated, "Notification preferences updated.");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
