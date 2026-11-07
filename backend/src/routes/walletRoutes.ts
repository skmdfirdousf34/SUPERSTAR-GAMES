import { Router } from "express";
import { WalletController } from "../controllers/walletController.js";
import { authenticateToken, checkNotFrozen } from "../middleware/auth.js";

const router = Router();

// Public Webhook for Gateway PayIN Callbacks & Banking Hours
router.post("/webhook/payin", WalletController.handlePayInWebhook);
router.get("/banking-hours", (_req, res) => {
  import("../services/bankingHoursService.js").then(({ getBankingHoursStatus }) => {
    res.json(getBankingHoursStatus());
  });
});

// Authenticated Routes
router.use(authenticateToken);

router.get("/", WalletController.getWallet);
router.get("/transactions", WalletController.getTransactions);
router.get("/turnover", WalletController.getTurnover);
router.post("/recharge", checkNotFrozen, WalletController.requestDeposit);
router.post("/withdraw", checkNotFrozen, WalletController.requestWithdrawal);
router.post("/bank-account", checkNotFrozen, WalletController.addBankAccount);

export default router;
