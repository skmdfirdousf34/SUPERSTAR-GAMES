import { Router } from "express";
import { AdminController } from "../controllers/adminController.js";
import {
  authenticateToken,
  requireAdmin,
  requireDepositStaffOrAdmin,
  requireWithdrawalStaffOrAdmin,
} from "../middleware/auth.js";
import { WinGoEngine } from "../games/wingo/wingoEngine.js";
import { AviatorEngine } from "../games/aviator/aviatorEngine.js";
import { PaymentGatewayService } from "../services/paymentGatewayService.js";

export function createAdminRoutes(wingoEngine: WinGoEngine, aviatorEngine: AviatorEngine) {
  const router = Router();

  // All administrative routes require valid user token
  router.use(authenticateToken);

  // 1. DEPOSIT OPERATOR / CASHIER ROUTES (Staff Deposit & Admin)
  router.get("/deposits", requireDepositStaffOrAdmin, AdminController.getPendingDeposits);
  router.post("/deposits/approve", requireDepositStaffOrAdmin, AdminController.approveDeposit);
  router.post("/deposits/reject", requireDepositStaffOrAdmin, AdminController.rejectDeposit);

  // 2. WITHDRAWAL OPERATOR / PAYOUT ROUTES (Staff Withdrawal & Admin)
  router.get("/withdrawals", requireWithdrawalStaffOrAdmin, AdminController.getPendingWithdrawals);
  router.post("/withdrawals/approve", requireWithdrawalStaffOrAdmin, AdminController.approveWithdrawal);
  router.post("/withdrawals/reject", requireWithdrawalStaffOrAdmin, AdminController.rejectWithdrawal);

  // 3. MASTER SUPER-ADMIN ROUTES (Strictly Owner/Admin Only)
  router.get("/stats", requireAdmin, AdminController.getDashboardStats);
  router.get("/users", requireAdmin, AdminController.getAllUsers);
  router.get("/users/:userId", requireAdmin, AdminController.getUserDetails);
  router.post("/users/freeze", requireAdmin, AdminController.toggleFreezeUser);
  router.post("/users/adjust-balance", requireAdmin, AdminController.manualAdjustBalance);

  // 4. 6-MONTH DATA RETENTION, AUTOMATED BACKUPS & AUDIT EXPORTS (Super Admin Only)
  router.get("/data-retention/stats", requireAdmin, AdminController.getDataRetentionStats);
  router.post("/data-retention/backup", requireAdmin, AdminController.triggerDatabaseBackup);
  router.get("/data-retention/export", requireAdmin, AdminController.exportDataCsv);

  // Auto-Payout & Gateway Settings
  router.get("/payout-settings", requireAdmin, (_req, res) => {
    res.json({
      autoPayoutThreshold: PaymentGatewayService.autoPayoutThreshold,
      gatewayMode: PaymentGatewayService.gatewayMode,
    });
  });

  router.post("/payout-settings", requireAdmin, (req, res) => {
    const { autoPayoutThreshold } = req.body;
    if (autoPayoutThreshold) {
      PaymentGatewayService.setThreshold(parseFloat(autoPayoutThreshold));
    }
    res.json({
      message: "Payout threshold updated successfully",
      autoPayoutThreshold: PaymentGatewayService.autoPayoutThreshold,
      gatewayMode: PaymentGatewayService.gatewayMode,
    });
  });

  // Live Algorithm & House Profit Control Endpoints
  router.get("/algorithm", requireAdmin, (_req, res) => {
    res.json({
      wingo: {
        mode: wingoEngine.algorithmMode,
        targetHouseMarginPercent: wingoEngine.targetHouseMarginPercent,
      },
      aviator: {
        mode: aviatorEngine.riskMode,
        maxAllowableRoundPayout: aviatorEngine.maxAllowableRoundPayout,
      },
    });
  });

  router.post("/algorithm", requireAdmin, (req, res) => {
    const { wingoMode, wingoMargin, aviatorMode, aviatorCap } = req.body;

    if (wingoMode) {
      wingoEngine.updateAlgorithmSettings(wingoMode, parseFloat(wingoMargin) || 25.0);
    }
    if (aviatorMode) {
      aviatorEngine.updateRiskSettings(aviatorMode, parseFloat(aviatorCap) || 20000);
    }

    res.json({
      message: "House profit algorithm settings updated successfully",
      wingo: {
        mode: wingoEngine.algorithmMode,
        targetHouseMarginPercent: wingoEngine.targetHouseMarginPercent,
      },
      aviator: {
        mode: aviatorEngine.riskMode,
        maxAllowableRoundPayout: aviatorEngine.maxAllowableRoundPayout,
      },
    });
  });

  return router;
}

export default createAdminRoutes;
