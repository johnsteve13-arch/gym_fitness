import { Request, Response, NextFunction } from "express";
import { RewardService } from "../services/reward.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class RewardController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rewards = await RewardService.listRewards();
      return sendSuccess(res, rewards);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const reward = await RewardService.createReward(req.body);
      await recordAuditLog(req, "REWARD_ITEM_CREATED", "rewards", reward.id, { title: reward.title });
      return sendSuccess(res, reward, "Reward catalog item created", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async redeem(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const result = await RewardService.redeemReward(memberId, req.params.id);
      await recordAuditLog(req, "REWARD_REDEEMED", "rewards", req.params.id, {
        memberId,
        points: result.reward.pointsCost,
      });

      return sendSuccess(res, result, "Reward successfully redeemed!");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = (req.query.memberId as string) || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const history = await RewardService.getMemberHistory(memberId);
      return sendSuccess(res, history);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
