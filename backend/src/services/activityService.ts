import { prisma } from "../lib/prisma.js";

// Rewards for 7-day attendance in INR
export const ATTENDANCE_REWARDS: Record<number, number> = {
  1: 10,
  2: 20,
  3: 30,
  4: 50,
  5: 75,
  6: 100,
  7: 200,
};

// Official Platform Gift Codes with reward amounts
export const VALID_GIFT_CODES: Record<string, number> = {
  SUPERSTAR100: 100,
  WELCOME50: 50,
  VIPBONUS: 150,
  DAMAN: 100,
  BONUS100: 100,
  LUCKY2026: 200,
};

/**
 * Returns IST date string "YYYY-MM-DD"
 */
export function getISTDateString(d: Date = new Date()): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
}

/**
 * Returns yesterday's IST date string "YYYY-MM-DD"
 */
export function getYesterdayISTDateString(): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const yesterday = new Date(Date.now() + istOffset - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().slice(0, 10);
}

/**
 * Calculates milliseconds remaining until tomorrow 00:00:00 IST
 */
export function getMillisecondsUntilTomorrowIST(): number {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  const istTomorrow = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1, 0, 0, 0)
  );

  return istTomorrow.getTime() - istNow.getTime();
}

export class ActivityService {
  /**
   * Get attendance status and streak details for user
   */
  static async getAttendanceStatus(userId: string) {
    const todayStr = getISTDateString();
    const yesterdayStr = getYesterdayISTDateString();

    const checkins = await prisma.attendanceCheckin.findMany({
      where: { userId },
      orderBy: { claimedAt: "desc" },
      take: 10,
    });

    const latest = checkins.length > 0 ? checkins[0] : null;

    let claimedToday = false;
    let currentStreak = 0;
    let claimableDay: number | null = 1;
    let checkedDays: number[] = [];

    if (!latest) {
      // User never checked in before
      claimedToday = false;
      currentStreak = 0;
      claimableDay = 1;
      checkedDays = [];
    } else if (latest.dateString === todayStr) {
      // User already checked in today!
      claimedToday = true;
      currentStreak = latest.day;
      claimableDay = null; // Cannot claim again today!
      checkedDays = Array.from({ length: currentStreak }, (_, i) => i + 1);
    } else if (latest.dateString === yesterdayStr) {
      // User checked in yesterday - consecutive streak!
      claimedToday = false;
      if (latest.day >= 7) {
        // Finished Day 7 yesterday, today starts new 7-day cycle at Day 1
        currentStreak = 0;
        claimableDay = 1;
        checkedDays = [];
      } else {
        currentStreak = latest.day;
        claimableDay = latest.day + 1;
        checkedDays = Array.from({ length: currentStreak }, (_, i) => i + 1);
      }
    } else {
      // Missed yesterday - streak broken, reset to Day 1
      claimedToday = false;
      currentStreak = 0;
      claimableDay = 1;
      checkedDays = [];
    }

    return {
      todayDate: todayStr,
      claimedToday,
      currentStreak,
      claimableDay,
      checkedDays,
      msUntilReset: getMillisecondsUntilTomorrowIST(),
      rewards: ATTENDANCE_REWARDS,
    };
  }

  /**
   * Claim Daily Attendance Check-in Bonus
   * Strictly enforces 1 claim per day and atomically credits user wallet!
   */
  static async claimAttendance(userId: string) {
    const todayStr = getISTDateString();
    const yesterdayStr = getYesterdayISTDateString();

    return await prisma.$transaction(async (tx) => {
      // 1. Guard against duplicate claims on the same day
      const existingToday = await tx.attendanceCheckin.findUnique({
        where: {
          userId_dateString: {
            userId,
            dateString: todayStr,
          },
        },
      });

      if (existingToday) {
        throw new Error(
          `Already Claimed Today: You have already claimed Day ${existingToday.day} attendance reward (₹${existingToday.reward})! Please return tomorrow for your next daily reward.`
        );
      }

      // 2. Check previous check-in to determine streak day
      const lastCheckin = await tx.attendanceCheckin.findFirst({
        where: { userId },
        orderBy: { claimedAt: "desc" },
      });

      let targetDay = 1;
      if (lastCheckin && lastCheckin.dateString === yesterdayStr) {
        // Consecutive streak continued
        targetDay = lastCheckin.day >= 7 ? 1 : lastCheckin.day + 1;
      } else {
        // First time or missed day -> starts at Day 1
        targetDay = 1;
      }

      const rewardAmount = ATTENDANCE_REWARDS[targetDay] || 10;

      // 3. Record attendance check-in
      const checkin = await tx.attendanceCheckin.create({
        data: {
          userId,
          day: targetDay,
          reward: rewardAmount,
          dateString: todayStr,
        },
      });

      // 4. Atomically credit user's Bonus Wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          bonusBalance: { increment: rewardAmount },
        },
      });

      // 5. Create transaction entry
      await tx.transaction.create({
        data: {
          userId,
          amount: rewardAmount,
          type: "ATTENDANCE_BONUS",
          status: "COMPLETED",
          adminNote: `7-Day Attendance Check-in: Day ${targetDay} Reward (+₹${rewardAmount} in Bonus Wallet)`,
        },
      });

      return {
        success: true,
        day: targetDay,
        reward: rewardAmount,
        newBalance: updatedWallet.balance,
        newBonusBalance: updatedWallet.bonusBalance,
        message: `🎉 Day ${targetDay} Attendance Reward (+₹${rewardAmount}) credited to your Bonus Wallet!`,
      };
    });
  }

  /**
   * Redeem Official Gift Code
   * Strictly 1 redemption per code per user & atomically credits wallet!
   */
  static async redeemGiftCode(userId: string, code: string) {
    const cleanCode = code.trim().toUpperCase();
    const bonusAmount = VALID_GIFT_CODES[cleanCode];

    if (!bonusAmount) {
      throw new Error(
        `Invalid or expired gift code "${cleanCode}". Follow our official Telegram channel (@Raayanhere) for daily live gift codes!`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Guard against duplicate redemption
      const existing = await tx.giftCodeRedemption.findUnique({
        where: {
          userId_code: {
            userId,
            code: cleanCode,
          },
        },
      });

      if (existing) {
        throw new Error(`You have already redeemed gift code "${cleanCode}"! Each code can be claimed once per player.`);
      }

      // 2. Record redemption
      await tx.giftCodeRedemption.create({
        data: {
          userId,
          code: cleanCode,
          amount: bonusAmount,
        },
      });

      // 3. Atomically credit user's Bonus Wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          bonusBalance: { increment: bonusAmount },
        },
      });

      // 4. Create transaction log
      await tx.transaction.create({
        data: {
          userId,
          amount: bonusAmount,
          type: "GIFT_CODE_BONUS",
          status: "COMPLETED",
          adminNote: `Gift Code Redemption: Code "${cleanCode}" (+₹${bonusAmount} in Bonus Wallet)`,
        },
      });

      return {
        success: true,
        code: cleanCode,
        amount: bonusAmount,
        newBalance: updatedWallet.balance,
        newBonusBalance: updatedWallet.bonusBalance,
        message: `🎉 Gift code "${cleanCode}" redeemed successfully! +₹${bonusAmount} added to your Bonus Wallet!`,
      };
    });
  }
}
