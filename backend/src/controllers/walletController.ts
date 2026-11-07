import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { WalletService } from "../services/walletService.js";
import { PaymentGatewayService } from "../services/paymentGatewayService.js";

export class WalletController {
  static async getWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const wallet = await WalletService.getWallet(req.user.id);
      res.json({
        ...wallet,
        realBalance: wallet.balance,
        bonusBalance: wallet.bonusBalance || 0.0,
        totalBalance: Number(((wallet.balance || 0) + (wallet.bonusBalance || 0)).toFixed(2)),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getTransactions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json(transactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Check 1x Turnover (Wagering) progress for withdrawal eligibility
   */
  static async getTurnover(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const turnover = await PaymentGatewayService.checkTurnover(req.user.id);
      res.json(turnover);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Automated Recharge (PayIN) with UTR Uniqueness and Bank Match
   */
  static async requestDeposit(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { amount, paymentMethod, utrNumber } = req.body;
      const parsedAmount = parseFloat(amount);
      if (!parsedAmount || parsedAmount < 100) {
        res.status(400).json({ error: "Minimum recharge amount is ₹100" });
        return;
      }

      if (!utrNumber) {
        res.status(400).json({ error: "12-digit UTR reference number is required" });
        return;
      }

      const result = await PaymentGatewayService.processRechargeWithAutoUTR(
        req.user.id,
        parsedAmount,
        paymentMethod || "UPI",
        utrNumber
      );

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Automated Withdrawal (PayOUT) with Smart Routing (<= 2k Auto, > 2k Admin Review)
   */
  static async requestWithdrawal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { amount, bankDetails } = req.body;
      const parsedAmount = parseFloat(amount);
      if (!parsedAmount || parsedAmount < 300) {
        res.status(400).json({ error: "Minimum withdrawal amount is ₹300" });
        return;
      }

      // Check if user has bank accounts saved or provided
      let bank = bankDetails;
      if (!bank) {
        const savedBank = await prisma.bankAccount.findFirst({
          where: { userId: req.user.id },
          orderBy: { createdAt: "desc" },
        });
        if (!savedBank) {
          res.status(400).json({
            error: "Please link a bank account or UPI ID before requesting withdrawal",
          });
          return;
        }
        bank = savedBank;
      }

      const result = await PaymentGatewayService.processWithdrawalWithSmartRouting(
        req.user.id,
        parsedAmount,
        bank
      );

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async addBankAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { accountHolderName, bankName, accountNumber, ifscCode, upiId } = req.body;

      if (!accountHolderName) {
        res.status(400).json({ error: "Account holder name is required" });
        return;
      }

      // Upsert bank account for user
      const existing = await prisma.bankAccount.findFirst({
        where: { userId: req.user.id },
      });

      let bank;
      if (existing) {
        bank = await prisma.bankAccount.update({
          where: { id: existing.id },
          data: {
            accountHolderName,
            bankName: bankName || existing.bankName,
            accountNumber: accountNumber || existing.accountNumber,
            ifscCode: ifscCode || existing.ifscCode,
            upiId: upiId || existing.upiId,
          },
        });
      } else {
        bank = await prisma.bankAccount.create({
          data: {
            userId: req.user.id,
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            upiId,
          },
        });
      }

      res.status(201).json({ message: "Bank account saved successfully", bank });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Gateway Webhook endpoint for PayIN
   */
  static async handlePayInWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { utr, amount, status, userId } = req.body;
      if (status === "SUCCESS" && utr && amount && userId) {
        await PaymentGatewayService.processRechargeWithAutoUTR(
          userId,
          parseFloat(amount),
          "GATEWAY_WEBHOOK",
          utr
        );
      }
      res.json({ received: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
