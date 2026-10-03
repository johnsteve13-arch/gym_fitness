import { Router } from "express";
import { MeasurementController } from "../controllers/measurement.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.post("/", MeasurementController.record);
router.get("/history", MeasurementController.getHistory);

export default router;
