import { Server } from "socket.io";
import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { WalletService } from "../../services/walletService.js";

interface ActiveBet {
  id: string;
  userId: string;
  betAmount: number;
  autoCashout?: number | null;
  cashoutMultiplier?: number | null;
  status: "PENDING" | "CASHED_OUT" | "CRASHED";
}

export type AviatorRiskMode = "BALANCED_PROFIT" | "CONSERVATIVE" | "PROVABLY_FAIR";

export class AviatorEngine {
  private io: Server;
  public currentRoundId: string = "";
  public roundNumber: string = "";
  public status: "BETTING" | "FLYING" | "CRASHED" = "BETTING";
  public currentMultiplier: number = 1.0;
  public crashPoint: number = 1.0;
  public bettingCountdown: number = 5;
  private loopInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private activeBets: Map<string, ActiveBet> = new Map();

  // House Risk Control & Live Zero-Loss Accounting
  public riskMode: AviatorRiskMode = "BALANCED_PROFIT";
  public maxAllowableRoundPayout: number = 20000; // Max ₹20,000 risk cap per round
  public roundTotalPool: number = 0;
  public roundTotalPaidOut: number = 0;

  constructor(io: Server) {
    this.io = io;
  }

  public async start() {
    await this.startBettingPhase();
  }

  /**
   * Base provably fair crash point generator using SHA256
   */
  private generateBaseCrashPoint(): { crashPoint: number; hash: string } {
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(serverSeed).digest("hex");

    // 4% House Edge: Instant crash at 1.00x - 1.08x
    const hs = parseInt(hash.slice(0, 8), 16);
    if (hs % 25 === 0) {
      const instantCrash = 1.00 + (Math.floor(Math.random() * 8) / 100);
      return { crashPoint: Number(instantCrash.toFixed(2)), hash };
    }

    const h = parseInt(hash.slice(0, 13), 16);
    const e = Math.pow(2, 52);
    const rawPoint = Math.floor((100 * e - h) / (e - h)) / 100;
    const crashPoint = Math.max(1.05, Math.min(rawPoint, 200.0));

    return { crashPoint: Number(crashPoint.toFixed(2)), hash };
  }

  private async startBettingPhase() {
    this.status = "BETTING";
    this.currentMultiplier = 1.0;
    this.bettingCountdown = 5;
    this.activeBets.clear();
    this.roundTotalPool = 0;
    this.roundTotalPaidOut = 0;

    const roundNum = `AV-${Date.now().toString().slice(-8)}`;
    this.roundNumber = roundNum;

    const { crashPoint, hash } = this.generateBaseCrashPoint();
    this.crashPoint = crashPoint;

    const round = await prisma.aviatorRound.create({
      data: {
        roundNumber: this.roundNumber,
        crashPoint: this.crashPoint,
        hash,
        status: "BETTING",
      },
    });

    this.currentRoundId = round.id;

    this.io.emit("aviator_betting_start", {
      roundNumber: this.roundNumber,
      countdown: this.bettingCountdown,
    });

    const countdownInterval = setInterval(() => {
      this.bettingCountdown -= 1;
      this.io.emit("aviator_countdown_tick", {
        countdown: this.bettingCountdown,
      });

      if (this.bettingCountdown <= 0) {
        clearInterval(countdownInterval);
        this.startFlyingPhase();
      }
    }, 1000);
  }

  /**
   * Smart House Profit & Risk Governor (Iron-Clad Zero-Loss Engine):
   * 1. If no real player bets in the round: let plane fly to thrilling high multipliers (5x-100x)!
   * 2. If real player bets exist: mathematically cap crashPoint so House Net Profit >= Target Margin (default 25-40%).
   * 3. Zero-Deficit Guarantee: Total payout in the round CANNOT exceed (Total Pool * (1 - House Margin)).
   * 4. In-flight Live Exposure Monitor: If uncached high-roller bets threaten the pool, crash immediately.
   */
  private optimizeCrashPointForHouseProfit() {
    if (this.riskMode === "PROVABLY_FAIR") {
      return;
    }

    const betsArray = Array.from(this.activeBets.values());
    const totalPool = betsArray.reduce((sum, b) => sum + b.betAmount, 0);
    this.roundTotalPool = totalPool;

    // Case 1: No bets placed this round (empty round or 0 real stakes)
    if (betsArray.length === 0 || totalPool <= 0) {
      // Allow thrilling high multipliers (moonshots!) to show in history bar and hype players
      return;
    }

    // Target Margin: 25% for BALANCED_PROFIT, 40% for CONSERVATIVE
    const targetMargin = this.riskMode === "CONSERVATIVE" ? 0.40 : 0.25;
    // ABSOLUTE ZERO-LOSS CONSTRAINT: Total payouts in this round CANNOT exceed (Pool * (1 - Margin))
    const maxAllowedTotalPayout = Math.min(
      Number((totalPool * (1 - targetMargin)).toFixed(2)),
      this.maxAllowableRoundPayout
    );

    // If only 1 bet exists, or if the smallest possible cashout (1.01x) of any bet exceeds maxAllowedTotalPayout:
    // It is mathematically impossible for anyone to cash out without breaching margin -> Crash at 1.00x!
    const minPossiblePayoutIfAnyCashout = Math.min(...betsArray.map((b) => b.betAmount * 1.01));
    if (minPossiblePayoutIfAnyCashout > maxAllowedTotalPayout) {
      this.crashPoint = 1.00;
      return;
    }

    // Find the highest multiplier m where Total Payout <= maxAllowedTotalPayout
    let safeCrashMultiplier = 1.00;
    const testMultipliers: number[] = [];
    for (let m = 1.05; m <= Math.min(this.crashPoint, 15.0); m = Number((m + 0.05).toFixed(2))) {
      testMultipliers.push(m);
    }

    for (const m of testMultipliers) {
      let potentialPayoutAtM = 0;

      for (const bet of betsArray) {
        // If bet has autoCashout <= m, they would cash out at autoCashout
        // If bet has no autoCashout or autoCashout > m, worst-case is they cash out right before m
        const effectiveMul = bet.autoCashout && bet.autoCashout <= m ? bet.autoCashout : m;
        potentialPayoutAtM += bet.betAmount * effectiveMul;
      }

      if (potentialPayoutAtM <= maxAllowedTotalPayout) {
        safeCrashMultiplier = m;
      } else {
        // Multiplier m causes payout to exceed allowable profit limit!
        break;
      }
    }

    // If safeCrashMultiplier is too low (e.g. <= 1.04), instant crash at 1.00x (takeoff)
    if (safeCrashMultiplier <= 1.04) {
      this.crashPoint = 1.00;
    } else {
      // Ensure crashPoint never exceeds safeCrashMultiplier
      this.crashPoint = Math.min(this.crashPoint, safeCrashMultiplier);
    }
  }

  private async startFlyingPhase() {
    this.status = "FLYING";
    this.startTime = Date.now();
    this.currentMultiplier = 1.0;

    // Optimize crash point right before takeoff based on actual placed bets
    this.optimizeCrashPointForHouseProfit();

    await prisma.aviatorRound.update({
      where: { id: this.currentRoundId },
      data: {
        status: "FLYING",
        startTime: new Date(),
        crashPoint: this.crashPoint,
      },
    });

    this.io.emit("aviator_flight_start", {
      roundNumber: this.roundNumber,
    });

    // Multiplier flight tick loop: runs every 80ms
    this.loopInterval = setInterval(async () => {
      const elapsed = (Date.now() - this.startTime) / 1000;
      // Exponential flight curve formula: e^(0.075 * t)
      const multiplier = Math.max(1.0, Math.pow(Math.E, 0.075 * elapsed));
      this.currentMultiplier = Number(multiplier.toFixed(2));

      // 1. Natural Crash Point reached: Crash immediately!
      if (this.currentMultiplier >= this.crashPoint) {
        await this.handleCrash();
        return;
      }

      // 2. Check auto-cashouts strictly for targets that are < crashPoint
      for (const [betId, bet] of this.activeBets.entries()) {
        if (
          bet.status === "PENDING" &&
          bet.autoCashout &&
          this.currentMultiplier >= bet.autoCashout &&
          bet.autoCashout < this.crashPoint
        ) {
          await this.processCashout(betId, bet.autoCashout);
          if (this.status === "CRASHED") return;
        }
      }

      // 3. Emit live flight tick
      this.io.emit("aviator_tick", {
        multiplier: this.currentMultiplier,
      });
    }, 80);
  }

  private async handleCrash() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.status = "CRASHED";

    // Set crashPoint to actual current multiplier if crashed by live safety guard
    this.crashPoint = Math.min(this.crashPoint, Math.max(1.00, this.currentMultiplier));

    await prisma.aviatorRound.update({
      where: { id: this.currentRoundId },
      data: {
        status: "CRASHED",
        crashPoint: this.crashPoint,
        crashTime: new Date(),
      },
    });

    // Mark remaining active bets as CRASHED
    for (const [betId, bet] of this.activeBets.entries()) {
      if (bet.status === "PENDING") {
        bet.status = "CRASHED";
        await prisma.aviatorBet.update({
          where: { id: betId },
          data: { status: "CRASHED" },
        });
      }
    }

    this.io.emit("aviator_crashed", {
      roundNumber: this.roundNumber,
      crashPoint: this.crashPoint,
    });

    // Wait 3 seconds and start the next round
    setTimeout(() => {
      this.startBettingPhase();
    }, 3000);
  }

  /**
   * Place an Aviator Bet
   */
  public async placeBet(userId: string, betAmount: number, autoCashout?: number) {
    if (this.status !== "BETTING") {
      throw new Error("Bets can only be placed during the countdown phase");
    }
    if (betAmount < 10) {
      throw new Error("Minimum bet is ₹10");
    }

    await WalletService.deductForBet(
      userId,
      betAmount,
      `Aviator bet for round ${this.roundNumber}`
    );

    const bet = await prisma.aviatorBet.create({
      data: {
        userId,
        roundId: this.currentRoundId,
        betAmount,
        autoCashout: autoCashout ? Number(autoCashout.toFixed(2)) : null,
      },
      include: {
        user: { select: { phone: true } },
      },
    });

    this.activeBets.set(bet.id, {
      id: bet.id,
      userId,
      betAmount,
      autoCashout: bet.autoCashout,
      status: "PENDING",
    });
    this.roundTotalPool += betAmount;

    this.io.emit("aviator_new_bet", {
      betId: bet.id,
      phone: bet.user.phone.slice(0, 3) + "****" + bet.user.phone.slice(-3),
      betAmount,
    });

    return bet;
  }

  /**
   * Cashout Handler (with Iron-Clad Zero-Loss House Guard)
   */
  public async processCashout(betId: string, cashoutAtMultiplier?: number, requestingUserId?: string) {
    if (this.status !== "FLYING") {
      throw new Error("Cannot cash out when the flight is not active");
    }

    const bet = this.activeBets.get(betId);
    if (!bet || bet.status !== "PENDING") {
      throw new Error("Bet not found or already cashed out");
    }

    // Security verification: A player cannot cash out another player's bet
    if (requestingUserId && bet.userId !== requestingUserId) {
      throw new Error("Unauthorized: You cannot cash out another player's bet");
    }

    const multiplier = cashoutAtMultiplier || this.currentMultiplier;
    if (multiplier >= this.crashPoint) {
      throw new Error("Plane already crashed");
    }

    const winAmount = Number((bet.betAmount * multiplier).toFixed(2));

    // IRON-CLAD ZERO-LOSS HOUSE GUARD:
    // Verify that paying this winAmount does NOT breach the round payout budget
    if (this.riskMode !== "PROVABLY_FAIR" && this.roundTotalPool > 0) {
      const targetMargin = this.riskMode === "CONSERVATIVE" ? 0.40 : 0.25;
      const maxAllowedTotalPayout = Math.min(
        Number((this.roundTotalPool * (1 - targetMargin)).toFixed(2)),
        this.maxAllowableRoundPayout
      );

      if (this.roundTotalPaidOut + winAmount > maxAllowedTotalPayout) {
        // THIS CASHOUT WOULD CAUSE THE HOUSE TO BREACH PROFIT MARGIN OR GO INTO LOSS!
        // Immediately crash the plane before crediting!
        await this.handleCrash();
        throw new Error("Plane flew away!");
      }
    }

    bet.status = "CASHED_OUT";
    bet.cashoutMultiplier = multiplier;
    this.roundTotalPaidOut += winAmount;

    const winAmountFormatted = winAmount;

    await prisma.aviatorBet.update({
      where: { id: betId },
      data: {
        status: "CASHED_OUT",
        cashoutMultiplier: multiplier,
        winAmount: winAmountFormatted,
      },
    });

    await WalletService.creditWinnings(
      bet.userId,
      winAmountFormatted,
      `Aviator cashout at ${multiplier}x for round ${this.roundNumber}`
    );

    const user = await prisma.user.findUnique({
      where: { id: bet.userId },
      select: { phone: true },
    });

    this.io.emit("aviator_user_cashed_out", {
      betId,
      phone: user?.phone ? user.phone.slice(0, 3) + "****" + user.phone.slice(-3) : "Player",
      multiplier,
      winAmount,
    });

    return {
      betId,
      multiplier,
      winAmount,
    };
  }

  public updateRiskSettings(mode: AviatorRiskMode, maxPayoutCap: number) {
    this.riskMode = mode;
    this.maxAllowableRoundPayout = maxPayoutCap;
  }
}
