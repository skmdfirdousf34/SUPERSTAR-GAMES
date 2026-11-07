import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma.js";

const BACKUP_DIR = path.resolve(process.cwd(), "backups");
const DB_PATH = path.resolve(process.cwd(), "prisma", "dev.db");

export interface DataRetentionStats {
  retentionWindowDays: number;
  oldestRecordDate: string | null;
  totalDaysRetained: number;
  totalPlayers: number;
  totalRecharges: number;
  totalRechargeAmount: number;
  totalWithdrawals: number;
  totalWithdrawalAmount: number;
  totalWinGoRounds: number;
  totalWinGoBets: number;
  totalAviatorRounds: number;
  totalAviatorBets: number;
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
  totalBackups: number;
  latestBackup: string | null;
}

export class DataRetentionService {
  /**
   * Ensure backups directory exists
   */
  private static ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Format bytes to readable string (KB, MB, GB)
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Fetch 6-Month Storage & Retention Statistics
   */
  static async getStats(): Promise<DataRetentionStats> {
    this.ensureBackupDir();

    // 6-Month Cutoff (180 days ago)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    // 1. Players count
    const totalPlayers = await prisma.user.count();

    // 2. Recharges
    const rechargeAgg = await prisma.transaction.aggregate({
      where: { type: "DEPOSIT", createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
      _sum: { amount: true },
    });

    // 3. Withdrawals
    const withdrawalAgg = await prisma.transaction.aggregate({
      where: { type: "WITHDRAWAL", createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
      _sum: { amount: true },
    });

    // 4. Game rounds and bets
    const totalWinGoRounds = await prisma.winGoRound.count({
      where: { createdAt: { gte: sixMonthsAgo } },
    });
    const totalWinGoBets = await prisma.winGoBet.count({
      where: { createdAt: { gte: sixMonthsAgo } },
    });
    const totalAviatorRounds = await prisma.aviatorRound.count({
      where: { createdAt: { gte: sixMonthsAgo } },
    });
    const totalAviatorBets = await prisma.aviatorBet.count({
      where: { createdAt: { gte: sixMonthsAgo } },
    });

    // 5. Oldest record
    const oldestUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    const oldestDate = oldestUser?.createdAt || new Date();
    const totalDaysRetained = Math.max(
      1,
      Math.ceil((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // 6. Database file size
    let databaseSizeBytes = 0;
    try {
      if (fs.existsSync(DB_PATH)) {
        const stat = fs.statSync(DB_PATH);
        databaseSizeBytes = stat.size;
      }
    } catch (_) {}

    // 7. Backup files list
    const backupFiles = fs
      .readdirSync(BACKUP_DIR)
      .filter((file) => file.endsWith(".db") || file.endsWith(".sqlite"))
      .sort()
      .reverse();

    return {
      retentionWindowDays: 180, // 6 Months policy
      oldestRecordDate: oldestUser ? oldestUser.createdAt.toISOString() : null,
      totalDaysRetained,
      totalPlayers,
      totalRecharges: rechargeAgg._count.id,
      totalRechargeAmount: rechargeAgg._sum.amount || 0,
      totalWithdrawals: withdrawalAgg._count.id,
      totalWithdrawalAmount: withdrawalAgg._sum.amount || 0,
      totalWinGoRounds,
      totalWinGoBets,
      totalAviatorRounds,
      totalAviatorBets,
      databaseSizeBytes,
      databaseSizeFormatted: this.formatBytes(databaseSizeBytes),
      totalBackups: backupFiles.length,
      latestBackup: backupFiles.length > 0 ? backupFiles[0] : null,
    };
  }

  /**
   * Create an instant snapshot backup of the entire SQLite database
   */
  static async createBackup(): Promise<{ fileName: string; fileSize: string; createdAt: string }> {
    this.ensureBackupDir();

    if (!fs.existsSync(DB_PATH)) {
      throw new Error("Source database file not found at " + DB_PATH);
    }

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/T/, "_")
      .replace(/\..+/, "")
      .replace(/:/g, "-");

    const backupFileName = `superstar_db_backup_${timestamp}.sqlite`;
    const targetPath = path.join(BACKUP_DIR, backupFileName);

    // Copy database file
    fs.copyFileSync(DB_PATH, targetPath);
    const stat = fs.statSync(targetPath);

    // Rolling backup retention: Keep last 30 snapshots, remove older ones
    try {
      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("superstar_db_backup_"))
        .sort();

      while (files.length > 30) {
        const oldest = files.shift();
        if (oldest) {
          fs.unlinkSync(path.join(BACKUP_DIR, oldest));
        }
      }
    } catch (err) {
      console.warn("Error cleaning old backups:", err);
    }

    return {
      fileName: backupFileName,
      fileSize: this.formatBytes(stat.size),
      createdAt: now.toISOString(),
    };
  }

  /**
   * Export 6 Months of Records to CSV
   */
  static async exportToCsv(
    type: "RECHARGES" | "WITHDRAWALS" | "WINGO_BETS" | "AVIATOR_BETS" | "PLAYERS",
    days = 180
  ): Promise<{ fileName: string; csvContent: string; recordCount: number }> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    if (type === "RECHARGES") {
      const records = await prisma.transaction.findMany({
        where: { type: "DEPOSIT", createdAt: { gte: cutoffDate } },
        include: { user: { select: { phone: true } } },
        orderBy: { createdAt: "desc" },
      });

      const header = "TransactionID,Phone,Amount,Status,PaymentMethod,UTR,Note,CreatedAt\n";
      const rows = records
        .map(
          (r) =>
            `"${r.id}","${r.user?.phone || ""}","${r.amount}","${r.status}","${r.paymentMethod || ""}","${r.utrNumber || ""}","${r.adminNote || ""}","${r.createdAt.toISOString()}"`
        )
        .join("\n");

      return {
        fileName: `recharges_6months_${Date.now()}.csv`,
        csvContent: header + rows,
        recordCount: records.length,
      };
    }

    if (type === "WITHDRAWALS") {
      const records = await prisma.transaction.findMany({
        where: { type: "WITHDRAWAL", createdAt: { gte: cutoffDate } },
        include: { user: { select: { phone: true } } },
        orderBy: { createdAt: "desc" },
      });

      const header = "TransactionID,Phone,Amount,Status,PaymentMethod,PayoutRef,Note,CreatedAt\n";
      const rows = records
        .map(
          (r) =>
            `"${r.id}","${r.user?.phone || ""}","${r.amount}","${r.status}","${r.paymentMethod || ""}","${r.payoutRef || ""}","${r.adminNote || ""}","${r.createdAt.toISOString()}"`
        )
        .join("\n");

      return {
        fileName: `withdrawals_6months_${Date.now()}.csv`,
        csvContent: header + rows,
        recordCount: records.length,
      };
    }

    if (type === "WINGO_BETS") {
      const records = await prisma.winGoBet.findMany({
        where: { createdAt: { gte: cutoffDate } },
        include: {
          user: { select: { phone: true } },
          round: { select: { period: true, winningNumber: true, winningColor: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });

      const header = "BetID,Phone,Period,SelectType,SelectValue,BetAmount,Multiplier,WinAmount,Status,WinningResult,CreatedAt\n";
      const rows = records
        .map(
          (r) =>
            `"${r.id}","${r.user?.phone || ""}","${r.round?.period || ""}","${r.selectType}","${r.selectValue}","${r.betAmount}","${r.payoutMultiplier}","${r.winAmount}","${r.status}","${r.round?.winningNumber || ""} (${r.round?.winningColor || ""})","${r.createdAt.toISOString()}"`
        )
        .join("\n");

      return {
        fileName: `wingo_bets_6months_${Date.now()}.csv`,
        csvContent: header + rows,
        recordCount: records.length,
      };
    }

    if (type === "AVIATOR_BETS") {
      const records = await prisma.aviatorBet.findMany({
        where: { createdAt: { gte: cutoffDate } },
        include: {
          user: { select: { phone: true } },
          round: { select: { roundNumber: true, crashPoint: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });

      const header = "BetID,Phone,RoundNumber,BetAmount,AutoCashout,CashoutMultiplier,WinAmount,Status,CrashPoint,CreatedAt\n";
      const rows = records
        .map(
          (r) =>
            `"${r.id}","${r.user?.phone || ""}","${r.round?.roundNumber || ""}","${r.betAmount}","${r.autoCashout || ""}","${r.cashoutMultiplier || ""}","${r.winAmount}","${r.status}","${r.round?.crashPoint || ""}x","${r.createdAt.toISOString()}"`
        )
        .join("\n");

      return {
        fileName: `aviator_bets_6months_${Date.now()}.csv`,
        csvContent: header + rows,
        recordCount: records.length,
      };
    }

    // Default: PLAYERS
    const records = await prisma.user.findMany({
      include: { wallet: true },
      orderBy: { createdAt: "desc" },
    });

    const header = "UserID,Phone,Role,ReferralCode,ReferredBy,HasPIN,Balance,TotalDeposits,TotalWithdrawals,Frozen,CreatedAt\n";
    const rows = records
      .map(
        (u) =>
          `"${u.id}","${u.phone}","${u.role}","${u.referralCode}","${u.referredBy || ""}","${!!u.securityPin}","${u.wallet?.balance || 0}","${u.wallet?.totalDeposit || 0}","${u.wallet?.totalWithdraw || 0}","${u.isFrozen}","${u.createdAt.toISOString()}"`
      )
      .join("\n");

    return {
      fileName: `players_dossier_${Date.now()}.csv`,
      csvContent: header + rows,
      recordCount: records.length,
    };
  }
}
