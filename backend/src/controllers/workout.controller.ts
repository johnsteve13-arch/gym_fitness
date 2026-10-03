import { Request, Response, NextFunction } from "express";
import { WorkoutService } from "../services/workout.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class WorkoutController {
  static async listPrograms(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = (req.query.memberId as string) || (req.user?.role === "member" ? req.user.memberId : undefined);
      const trainerId = req.query.trainerId as string;
      const isTemplate = req.query.isTemplate !== undefined ? req.query.isTemplate === "true" : undefined;

      const programs = await WorkoutService.listPrograms({ memberId, trainerId, isTemplate });
      return sendSuccess(res, programs);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.body.trainerId || req.user?.trainerId;
      const program = await WorkoutService.createProgram({
        ...req.body,
        trainerId,
      });
      await recordAuditLog(req, "WORKOUT_PROGRAM_CREATED", "workout_programs", program.id, { title: program.title });
      return sendSuccess(res, program, "Workout program created", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async logWorkout(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const result = await WorkoutService.logWorkout({
        ...req.body,
        memberId,
      });

      await recordAuditLog(req, "WORKOUT_LOGGED", "workout_logs", result.log.id, {
        workoutName: result.log.workoutName,
        prsAchieved: result.prsAchieved,
      });

      return sendSuccess(res, result, "Workout recorded successfully!", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = (req.query.memberId as string) || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const logs = await WorkoutService.getWorkoutLogs(memberId);
      return sendSuccess(res, logs);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getPersonalRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = (req.query.memberId as string) || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const prs = await WorkoutService.getPersonalRecords(memberId);
      return sendSuccess(res, prs);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
