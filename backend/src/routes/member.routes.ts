import { Router } from "express";
import { MemberController } from "../controllers/member.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.get("/", isStaffOrAdmin, MemberController.list);
router.get("/:id", MemberController.getById);
router.post("/", isStaffOrAdmin, MemberController.create);
router.patch("/:id", isStaffOrAdmin, MemberController.update);
router.delete("/:id", isStaffOrAdmin, MemberController.delete);

export default router;
