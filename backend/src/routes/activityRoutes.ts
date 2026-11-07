import { Router } from "express";
import { ActivityController } from "../controllers/activityController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// All activity routes require authentication
router.use(authenticateToken);

router.get("/attendance", ActivityController.getAttendanceStatus);
router.post("/attendance/claim", ActivityController.claimAttendance);
router.post("/gift-code/redeem", ActivityController.redeemGiftCode);

export default router;
