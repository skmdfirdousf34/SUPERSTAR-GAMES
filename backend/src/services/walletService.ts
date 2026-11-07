import { prisma } from "../lib/prisma.js";

export class WalletService {
  /**
   * Get user wallet details
   */
  static async getWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0.0, bonusBalance: 0.0 },
      });
    }

    return wallet;
  }

  /**
   * Proportional Bonus Burn Rule:
   * Bonus Wallet can be used up to 50% of the Real Money used (meaning max 1/3 of total bet).
   * E.g. For a ₹150 bet: ₹100 from Real Wallet + ₹50 from Bonus Wallet.
   * Player MUST have enough Real Cash to fund the real portion!
   */
  static calculateBetSplit(amount: number, realBalance: number, bonusBalance: number) {
    const maxBonusAllowed = Number((amount / 3).toFixed(2));
    const availableBonus = Math.max(0, bonusBalance || 0);

    let bonusUsed = Math.min(availableBonus, maxBonusAllowed);
    let realUsed = Number((amount - bonusUsed).toFixed(2));

    // Ensure bonusUsed <= realUsed * 0.5 (safe precision check)
    if (bonusUsed > 0 && Number((realUsed * 0.5).toFixed(2)) < bonusUsed) {
      bonusUsed = Number((realUsed * 0.5).toFixed(2));
      realUsed = Number((amount - bonusUsed).toFixed(2));
    }

    return { realUsed, bonusUsed };
  }

  /**
   * Atomically deduct balance for a bet using the 2:1 Real to Bonus ratio rule
   */
  static async deductForBet(userId: string, amount: number, note: string) {
    if (amount <= 0) throw new Error("Bet amount must be positive");

    return await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, balance: 0.0, bonusBalance: 0.0 },
        });
      }

      const { realUsed, bonusUsed } = WalletService.calculateBetSplit(
        amount,
        wallet.balance,
        wallet.bonusBalance
      );

      // Check if user has sufficient real balance
      if (wallet.balance < realUsed) {
        if (wallet.balance <= 0 && wallet.bonusBalance > 0) {
          throw new Error(
            `Real Cash Required: You have ₹${wallet.bonusBalance.toFixed(2)} in your Bonus Wallet, but bonus can only be used alongside Real Cash (₹1 bonus for every ₹2 real cash). Please recharge your wallet to start playing!`
          );
        }
        throw new Error(
          `Insufficient Real Cash balance. To place this ₹${amount} bet (with ₹${bonusUsed} bonus applied), you need at least ₹${realUsed} in your Real Wallet. Current Real Cash: ₹${wallet.balance.toFixed(2)}. Please recharge!`
        );
      }

      // Deduct real balance and bonus balance atomically
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: realUsed },
          bonusBalance: bonusUsed > 0 ? { decrement: bonusUsed } : undefined,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          amount,
          type: "BET_LOSS",
          status: "COMPLETED",
          adminNote: `${note} (Paid: ₹${realUsed} Real Cash + ₹${bonusUsed} Bonus Cash)`,
        },
      });

      return {
        ...updatedWallet,
        realUsed,
        bonusUsed,
      };
    });
  }

  /**
   * Atomically credit winnings to user wallet (All net winnings become Real Cash)
   */
  static async creditWinnings(userId: string, amount: number, note: string) {
    if (amount <= 0) return null;

    return await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          amount,
          type: "BET_WIN",
          status: "COMPLETED",
          adminNote: note,
        },
      });

      return updatedWallet;
    });
  }

  /**
   * Atomically credit bonus rewards (Signup, Referral, Check-in, Gift Code) to Bonus Wallet
   */
  static async creditBonus(
    userId: string,
    amount: number,
    note: string,
    type: "REFERRAL_BONUS" | "ATTENDANCE_BONUS" | "GIFT_CODE_BONUS" | "WELCOME_BONUS" = "WELCOME_BONUS"
  ) {
    if (amount <= 0) return null;

    return await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: 0.0,
          bonusBalance: amount,
        },
        update: {
          bonusBalance: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          amount,
          type,
          status: "COMPLETED",
          adminNote: `${note} (+₹${amount} credited to Bonus Wallet)`,
        },
      });

      return updatedWallet;
    });
  }

  /**
   * Request Deposit (Recharge)
   */
  static async requestDeposit(
    userId: string,
    amount: number,
    paymentMethod: string,
    utrNumber?: string
  ) {
    if (amount < 100) throw new Error("Minimum deposit is ₹100");

    const { getBankingHoursStatus } = await import("./bankingHoursService.js");
    const banking = getBankingHoursStatus();
    if (!banking.isOpen) {
      throw new Error(banking.message);
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount,
        type: "DEPOSIT",
        status: "PENDING",
        paymentMethod,
        utrNumber,
      },
    });

    return transaction;
  }

  /**
   * Request Withdrawal (Only Real Cash can be withdrawn, Bonus Wallet is for playing)
   */
  static async requestWithdrawal(userId: string, amount: number) {
    if (amount < 100) throw new Error("Minimum withdrawal is ₹100");

    const { getBankingHoursStatus } = await import("./bankingHoursService.js");
    const banking = getBankingHoursStatus();
    if (!banking.isOpen) {
      throw new Error(banking.message);
    }

    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < amount) {
        if (wallet && wallet.balance + wallet.bonusBalance >= amount) {
          throw new Error(
            `Withdrawal is only permitted from Real Cash Wallet (Current Real Cash: ₹${wallet.balance.toFixed(2)}). Bonus Wallet funds (₹${wallet.bonusBalance.toFixed(2)}) can be used in games (50% bonus with real cash) to win real withdrawable cash!`
          );
        }
        throw new Error("Insufficient real cash balance for withdrawal");
      }

      // Deduct balance upfront from Real Cash to lock withdrawal
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount,
          type: "WITHDRAWAL",
          status: "PENDING",
        },
      });

      return transaction;
    });
  }

  /**
   * Admin approves a deposit (Real Cash)
   */
  static async approveDeposit(transactionId: string) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction || transaction.type !== "DEPOSIT") {
        throw new Error("Invalid deposit transaction");
      }
      if (transaction.status === "APPROVED" || transaction.status === "COMPLETED") {
        throw new Error("Transaction already processed");
      }

      await tx.wallet.update({
        where: { userId: transaction.userId },
        data: {
          balance: { increment: transaction.amount },
          totalDeposit: { increment: transaction.amount },
        },
      });

      return await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "APPROVED" },
      });
    });
  }

  /**
   * Admin approves a withdrawal
   */
  static async approveWithdrawal(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: {
          include: {
            bankAccounts: true,
          },
        },
      },
    });

    if (!transaction || transaction.type !== "WITHDRAWAL") {
      throw new Error("Invalid withdrawal transaction");
    }
    if (transaction.status === "APPROVED" || transaction.status === "COMPLETED") {
      throw new Error("Transaction already processed");
    }

    const rawBank = transaction.user.bankAccounts[0];
    const bank = {
      accountHolderName: rawBank?.accountHolderName || "User",
      bankName: rawBank?.bankName || undefined,
      accountNumber: rawBank?.accountNumber || undefined,
      ifscCode: rawBank?.ifscCode || undefined,
      upiId: rawBank?.upiId || (transaction.paymentMethod === "UPI" ? "user@upi" : undefined),
    };

    // Execute transfer through gateway adapter (Cashfree / Decentro / Sandbox)
    const { PaymentGatewayService } = await import("./paymentGatewayService.js");
    const transferResult = await PaymentGatewayService.dispatchBankTransfer(
      transaction.amount,
      bank,
      `TXN_${transaction.id.slice(0, 8)}`
    );

    return await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: transaction.userId },
        data: {
          totalWithdraw: { increment: transaction.amount },
        },
      });

      return await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: "COMPLETED",
          payoutRef: transferResult.payoutRef,
          adminNote: `Manual Admin approval executed & transferred via ${transaction.paymentMethod || "IMPS"} (Ref: ${transferResult.payoutRef})`,
        },
      });
    });
  }

  /**
   * Admin rejects a withdrawal (refunds balance to Real Wallet)
   */
  static async rejectWithdrawal(transactionId: string, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction || transaction.type !== "WITHDRAWAL" || transaction.status !== "PENDING") {
        throw new Error("Transaction is not pending withdrawal");
      }

      // Refund the locked amount back to Real Cash wallet
      await tx.wallet.update({
        where: { userId: transaction.userId },
        data: {
          balance: { increment: transaction.amount },
        },
      });

      return await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: "REJECTED",
          adminNote: reason || "Withdrawal rejected by admin",
        },
      });
    });
  }
}
