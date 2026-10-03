import { Request, Response, NextFunction } from "express";
import { PaymentService } from "../services/payment.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class PaymentController {
  static async process(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const payment = await PaymentService.processPayment({
        ...req.body,
        memberId,
      });

      await recordAuditLog(req, "PAYMENT_PROCESSED", "payments", payment.id, {
        invoiceNumber: payment.invoiceNumber,
        netAmount: payment.netAmount,
        paymentType: payment.paymentType,
      });

      return sendSuccess(res, payment, "Payment processed successfully", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const memberId = (req.query.memberId as string) || (req.user?.role === "member" ? req.user.memberId : undefined);
      const paymentStatus = req.query.paymentStatus as string;
      const paymentType = req.query.paymentType as string;

      const result = await PaymentService.listPayments({ memberId, paymentStatus, paymentType, page, limit });
      return sendSuccess(res, result.payments, "Payments retrieved", 200, result.meta);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async refund(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const refunded = await PaymentService.refundPayment(req.params.id, reason);
      await recordAuditLog(req, "PAYMENT_REFUNDED", "payments", req.params.id, { reason });
      return sendSuccess(res, refunded, "Payment refund issued successfully");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getFinancialAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await PaymentService.getFinancialAnalytics();
      return sendSuccess(res, analytics);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
