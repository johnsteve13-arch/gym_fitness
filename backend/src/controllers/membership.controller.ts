import { Request, Response, NextFunction } from "express";
import { MembershipService } from "../services/membership.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class MembershipController {
  static async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await MembershipService.listPlans();
      return sendSuccess(res, plans);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await MembershipService.createPlan(req.body);
      await recordAuditLog(req, "MEMBERSHIP_PLAN_CREATED", "membership_plans", plan.id, { name: plan.name });
      return sendSuccess(res, plan, "Membership plan created", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await MembershipService.updatePlan(req.params.id, req.body);
      await recordAuditLog(req, "MEMBERSHIP_PLAN_UPDATED", "membership_plans", plan.id);
      return sendSuccess(res, plan, "Membership plan updated");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async assignOrUpgrade(req: Request, res: Response, next: NextFunction) {
    try {
      const membership = await MembershipService.assignOrUpgradeMembership(req.body);
      await recordAuditLog(req, "MEMBERSHIP_ASSIGNED", "memberships", membership.id, {
        memberId: req.body.memberId,
        planId: req.body.planId,
      });
      return sendSuccess(res, membership, "Membership package assigned");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async extend(req: Request, res: Response, next: NextFunction) {
    try {
      const { additionalDays, notes } = req.body;
      const membership = await MembershipService.extendMembership(req.params.id, additionalDays, notes);
      await recordAuditLog(req, "MEMBERSHIP_EXTENDED", "memberships", membership.id, { additionalDays });
      return sendSuccess(res, membership, "Membership extended successfully");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async freeze(req: Request, res: Response, next: NextFunction) {
    try {
      const { durationDays, reason } = req.body;
      const membership = await MembershipService.freezeMembership(req.params.id, durationDays, reason);
      await recordAuditLog(req, "MEMBERSHIP_FROZEN", "memberships", membership.id, { durationDays, reason });
      return sendSuccess(res, membership, "Membership frozen successfully");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async unfreeze(req: Request, res: Response, next: NextFunction) {
    try {
      const membership = await MembershipService.unfreezeMembership(req.params.id);
      await recordAuditLog(req, "MEMBERSHIP_UNFROZEN", "memberships", membership.id);
      return sendSuccess(res, membership, "Membership un-frozen and active");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const membership = await MembershipService.cancelMembership(req.params.id, reason);
      await recordAuditLog(req, "MEMBERSHIP_CANCELLED", "memberships", membership.id, { reason });
      return sendSuccess(res, membership, "Membership cancelled");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async renew(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);
      const membership = await MembershipService.renewMembership(memberId);
      await recordAuditLog(req, "MEMBERSHIP_RENEWED", "memberships", membership.id, { memberId });
      return sendSuccess(res, membership, "Membership renewed successfully");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
