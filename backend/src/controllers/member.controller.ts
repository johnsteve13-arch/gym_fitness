import { Request, Response, NextFunction } from "express";
import { MemberService } from "../services/member.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class MemberController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const membershipStatus = req.query.membershipStatus as string;

      const result = await MemberService.listMembers({ page, limit, search, status, membershipStatus });
      return sendSuccess(res, result.members, "Members retrieved", 200, result.meta);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await MemberService.getMemberById(req.params.id);
      return sendSuccess(res, member);
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await MemberService.createMember(req.body);
      await recordAuditLog(req, "MEMBER_CREATED", "members", member.id, { memberCode: member.memberCode });
      return sendSuccess(res, member, "Member registered successfully", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await MemberService.updateMember(req.params.id, req.body);
      await recordAuditLog(req, "MEMBER_UPDATED", "members", member.id);
      return sendSuccess(res, member, "Member updated successfully");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MemberService.deleteMember(req.params.id);
      await recordAuditLog(req, "MEMBER_DELETED", "members", req.params.id);
      return sendSuccess(res, result, "Member removed successfully");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
