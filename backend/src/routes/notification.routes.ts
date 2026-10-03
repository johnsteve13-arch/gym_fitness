import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.get("/", NotificationController.list);
router.patch("/:id/read", NotificationController.markAsRead);
router.patch("/read-all", NotificationController.markAllAsRead);
router.post("/broadcast", isStaffOrAdmin, NotificationController.broadcast);

export default router;
