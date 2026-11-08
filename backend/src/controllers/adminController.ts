import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { WalletService } from "../services/walletService.js";
import { DataRetentionService } from "../services/dataRetentionService.js";

export class AdminController {
  static async getDashboardStats(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 1. Total players
      const totalUsers = await prisma.user.count({
        where: { role: "USER" },
      });

      // 2. Active total user liability (Sum of all active user wallets)
      const userWallets = await prisma.wallet.aggregate({
        where: { user: { role: "USER" } },
        _sum: { balance: true },
      });
      const totalUserBalance = userWallets._sum.balance || 0;

      // 3. All-time completed Deposits & Withdrawals
      const totalDeposits = await prisma.transaction.aggregate({
        where: { type: "DEPOSIT", status: "APPROVED" },
        _sum: { amount: true },
      });

      const totalWithdrawals = await prisma.transaction.aggregate({
        where: { type: "WITHDRAWAL", status: "COMPLETED" },
        _sum: { amount: true },
      });

      const depositSum = totalDeposits._sum.amount || 0;
      const withdrawSum = totalWithdrawals._sum.amount || 0;
      const allTimeNetRevenue = depositSum - withdrawSum;

      // 4. Today's Recharges
      const todayDeposits = await prisma.transaction.aggregate({
        where: {
          type: "DEPOSIT",
          status: "APPROVED",
          createdAt: { gte: startOfToday },
        },
        _sum: { amount: true },
        _count: { id: true },
      });
      const todayRechargeAmount = todayDeposits._sum.amount || 0;
      const todayRechargeCount = todayDeposits._count.id || 0;

      // 5. Today's Withdrawals
      const todayWithdrawals = await prisma.transaction.aggregate({
        where: {
          type: "WITHDRAWAL",
          status: "COMPLETED",
          createdAt: { gte: startOfToday },
        },
        _sum: { amount: true },
        _count: { id: true },
      });
      const todayWithdrawalAmount = todayWithdrawals._sum.amount || 0;
      const todayWithdrawalCount = todayWithdrawals._count.id || 0;

      // 6. Today's Net Profit
      const todayNetProfit = todayRechargeAmount - todayWithdrawalAmount;

      // 7. Pending Withdrawals (Count & Total Amount)
      const pendingWithdrawalsAgg = await prisma.transaction.aggregate({
        where: { type: "WITHDRAWAL", status: "PENDING" },
        _sum: { amount: true },
        _count: { id: true },
      });
      const pendingWithdrawalsCount = pendingWithdrawalsAgg._count.id || 0;
      const pendingWithdrawalsAmount = pendingWithdrawalsAgg._sum.amount || 0;

      // 8. Pending Deposits (Count & Total Amount)
      const pendingDepositsAgg = await prisma.transaction.aggregate({
        where: { type: "DEPOSIT", status: "PENDING" },
        _sum: { amount: true },
        _count: { id: true },
      });
      const pendingDepositsCount = pendingDepositsAgg._count.id || 0;
      const pendingDepositsAmount = pendingDepositsAgg._sum.amount || 0;

      // 9. Total Owner Withdrawals (Settled / Taken Out of Bank)
      const ownerWithdrawalsAgg = await prisma.transaction.aggregate({
        where: { type: "OWNER_WITHDRAWAL", status: "COMPLETED" },
        _sum: { amount: true },
        _count: { id: true },
      });
      const totalOwnerWithdrawn = ownerWithdrawalsAgg._sum.amount || 0;
      const ownerWithdrawalsCount = ownerWithdrawalsAgg._count.id || 0;

      // 10. Safe-to-Withdraw Company Profit (Real Cash Free Flow)
      // Math: (All deposits received) - (All withdrawals paid) - (User wallet liabilities) - (Pending withdrawals) - (Already withdrawn by owner)
      const totalGrossProfit = Math.max(
        0,
        depositSum - withdrawSum - totalUserBalance - pendingWithdrawalsAmount
      );
      const safeWithdrawableProfit = Math.max(
        0,
        totalGrossProfit - totalOwnerWithdrawn
      );

      res.json({
        totalUsers,
        totalUserBalance,
        allTimeDeposits: depositSum,
        allTimeWithdrawals: withdrawSum,
        allTimeNetRevenue,
        todayRechargeAmount,
        todayRechargeCount,
        todayWithdrawalAmount,
        todayWithdrawalCount,
        todayNetProfit,
        pendingWithdrawalsCount,
        pendingWithdrawalsAmount,
        pendingDepositsCount,
        pendingDepositsAmount,
        totalGrossProfit,
        totalOwnerWithdrawn,
        ownerWithdrawalsCount,
        safeWithdrawableProfit,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getPendingDeposits(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const deposits = await prisma.transaction.findMany({
        where: { type: "DEPOSIT", status: "PENDING" },
        include: {
          user: { select: { id: true, phone: true, isFrozen: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(deposits);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async approveDeposit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { transactionId } = req.body;
      const updated = await WalletService.approveDeposit(transactionId);
      res.json({ message: "Deposit approved and credited to user wallet", transaction: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async rejectDeposit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { transactionId, reason } = req.body;
      const deposit = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!deposit || deposit.type !== "DEPOSIT" || deposit.status !== "PENDING") {
        res.status(400).json({ error: "Invalid pending deposit transaction" });
        return;
      }

      const updated = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: "REJECTED",
          adminNote: reason || "Fake / Unverified UTR reference",
        },
      });

      res.json({ message: "Deposit rejected", transaction: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getPendingWithdrawals(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const withdrawals = await prisma.transaction.findMany({
        where: { type: "WITHDRAWAL", status: "PENDING" },
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              isFrozen: true,
              bankAccounts: true,
              wallet: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(withdrawals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async approveWithdrawal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { transactionId } = req.body;
      const updated = await WalletService.approveWithdrawal(transactionId);
      res.json({ message: "Withdrawal marked as completed (Transferred)", transaction: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async rejectWithdrawal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { transactionId, reason } = req.body;
      const updated = await WalletService.rejectWithdrawal(transactionId, reason);
      res.json({ message: "Withdrawal rejected and refunded to user wallet", transaction: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAllUsers(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: { role: "USER" },
        include: {
          wallet: true,
          bankAccounts: true,
          _count: {
            select: {
              winGoBets: true,
              aviatorBets: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async toggleFreezeUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, reason } = req.body;
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (targetUser.role === "ADMIN") {
        res.status(400).json({ error: "Cannot freeze administrator account" });
        return;
      }

      const newFrozenState = !targetUser.isFrozen;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          isFrozen: newFrozenState,
          freezeReason: newFrozenState ? (reason || "Suspended by platform administration") : null,
        },
      });

      res.json({
        message: newFrozenState
          ? `User ${targetUser.phone} has been FROZEN`
          : `User ${targetUser.phone} has been UNFROZEN`,
        user: updated,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getUserDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallet: true,
          bankAccounts: true,
          transactions: { orderBy: { createdAt: "desc" }, take: 25 },
          winGoBets: { orderBy: { createdAt: "desc" }, take: 20 },
          aviatorBets: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async manualAdjustBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, amount, type, note } = req.body;
      const numericAmount = parseFloat(amount);

      if (type === "ADD") {
        await WalletService.creditWinnings(userId, numericAmount, note || "Admin manual credit");
      } else if (type === "DEDUCT") {
        await WalletService.deductForBet(userId, numericAmount, note || "Admin manual debit");
      } else {
        res.status(400).json({ error: "Invalid adjustment type. Use ADD or DEDUCT" });
        return;
      }

      const updatedWallet = await WalletService.getWallet(userId);
      res.json({ message: "Balance updated successfully", wallet: updatedWallet });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * 6-Month Data Retention & Storage Health Stats
   */
  static async getDataRetentionStats(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await DataRetentionService.getStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Trigger Manual Snapshot Backup
   */
  static async triggerDatabaseBackup(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await DataRetentionService.createBackup();
      res.json({ message: "Database snapshot backup completed successfully!", ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Export 6-Month Records as CSV
   */
  static async exportDataCsv(req: AuthRequest, res: Response): Promise<void> {
    try {
      const type = (req.query.type as any) || "RECHARGES";
      const days = parseInt(req.query.days as string) || 180;

      const validTypes = ["RECHARGES", "WITHDRAWALS", "WINGO_BETS", "AVIATOR_BETS", "PLAYERS"];
      if (!validTypes.includes(type)) {
        res.status(400).json({ error: "Invalid export type. Use: " + validTypes.join(", ") });
        return;
      }

      const { fileName, csvContent, recordCount } = await DataRetentionService.exportToCsv(
        type,
        days
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("X-Record-Count", recordCount.toString());
      res.status(200).send(csvContent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get Past Owner Profit Settlements
   */
  static async getOwnerSettlements(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const settlements = await prisma.transaction.findMany({
        where: { type: "OWNER_WITHDRAWAL" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.json(settlements);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Record an Owner Profit Settlement (Taking Profit Out of Company Account)
   */
  static async recordOwnerSettlement(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { amount, note, paymentMethod } = req.body;
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ error: "Please enter a valid amount greater than ₹0" });
        return;
      }

      // Re-verify current live safe profit to prevent overdraft
      const [userWallets, totalDeposits, totalWithdrawals, pendingWithdrawalsAgg, ownerWithdrawalsAgg] =
        await Promise.all([
          prisma.wallet.aggregate({
            where: { user: { role: "USER" } },
            _sum: { balance: true },
          }),
          prisma.transaction.aggregate({
            where: { type: "DEPOSIT", status: "APPROVED" },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { type: "WITHDRAWAL", status: "COMPLETED" },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { type: "WITHDRAWAL", status: "PENDING" },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { type: "OWNER_WITHDRAWAL", status: "COMPLETED" },
            _sum: { amount: true },
          }),
        ]);

      const totalUserBalance = userWallets._sum.balance || 0;
      const depositSum = totalDeposits._sum.amount || 0;
      const withdrawSum = totalWithdrawals._sum.amount || 0;
      const pendingWithdrawalsAmount = pendingWithdrawalsAgg._sum.amount || 0;
      const totalOwnerWithdrawn = ownerWithdrawalsAgg._sum.amount || 0;

      const totalGrossProfit = Math.max(
        0,
        depositSum - withdrawSum - totalUserBalance - pendingWithdrawalsAmount
      );
      const safeWithdrawableProfit = Math.max(0, totalGrossProfit - totalOwnerWithdrawn);

      if (numAmount > safeWithdrawableProfit) {
        res.status(400).json({
          error: `Requested amount ₹${numAmount.toFixed(2)} exceeds current Safe Withdrawable Profit (₹${safeWithdrawableProfit.toFixed(2)})`,
        });
        return;
      }

      const settlement = await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: "OWNER_WITHDRAWAL",
          amount: numAmount,
          status: "COMPLETED",
          paymentMethod: paymentMethod || "BANK_TRANSFER",
          adminNote: note || "Owner profit payout recorded to personal bank",
        },
      });

      res.json({
        message: `Owner profit payout of ₹${numAmount.toFixed(2)} recorded successfully!`,
        settlement,
        remainingSafeProfit: Math.max(0, safeWithdrawableProfit - numAmount),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
