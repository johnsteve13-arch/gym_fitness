import { Router } from "express";
import { WorkoutController } from "../controllers/workout.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/programs", WorkoutController.listPrograms);
router.post("/programs", WorkoutController.createProgram);
router.post("/logs", WorkoutController.logWorkout);
router.get("/logs", WorkoutController.getLogs);
router.get("/personal-records", WorkoutController.getPersonalRecords);

export default router;
