import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/send-otp", AuthController.sendOtp);
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/reset-password", AuthController.resetPassword);
router.get("/me", authenticateToken, AuthController.getMe);
router.get("/referrals", authenticateToken, AuthController.getReferralStats);
router.post("/change-password", authenticateToken, AuthController.changePassword);
router.post("/security-pin", authenticateToken, AuthController.setSecurityPin);

export default router;
