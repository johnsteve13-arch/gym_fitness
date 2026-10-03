import { Request, Response, NextFunction } from "express";
import { NotificationService } from "../services/notification.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, "Unauthorized", 401);
      const data = await NotificationService.listUserNotifications(req.user.id);
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, "Unauthorized", 401);
      await NotificationService.markAsRead(req.params.id, req.user.id);
      return sendSuccess(res, { id: req.params.id }, "Notification marked as read");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, "Unauthorized", 401);
      await NotificationService.markAllAsRead(req.user.id);
      return sendSuccess(res, null, "All notifications marked as read");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async broadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, message } = req.body;
      if (!title || !message) return sendError(res, "Title and message are required", 400);

      await NotificationService.broadcastAnnouncement(title, message);
      return sendSuccess(res, null, "Announcement broadcasted to all active members");
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
