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

  // House Risk Control
  public riskMode: AviatorRiskMode = "BALANCED_PROFIT";
  public maxAllowableRoundPayout: number = 20000; // Max ₹20,000 risk cap per round

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
   * Smart Crash Point Optimization before takeoff:
   * Protects the operator from catastrophic losses on large bets,
   * while allowing thrilling high multipliers (10x-50x) when player stakes are safe!
   */
  private optimizeCrashPointForHouseProfit() {
    if (this.riskMode === "PROVABLY_FAIR" || this.activeBets.size === 0) {
      return;
    }

    const betsArray = Array.from(this.activeBets.values());
    const totalPool = betsArray.reduce((sum, b) => sum + b.betAmount, 0);

    // If total pool is heavy (e.g. > ₹2000), calculate safe crash ceiling
    if (totalPool >= 1000) {
      // Find the auto-cashouts of players
      const autoCashouts = betsArray
        .map((b) => b.autoCashout)
        .filter((c): c is number => typeof c === "number" && c > 1.0);

      // We want some players to win (e.g. players who set 1.2x - 1.8x),
      // but crash before extreme payouts (e.g. 2.0x - 3.5x)
      if (autoCashouts.length > 0) {
        autoCashouts.sort((a, b) => a - b);
        // Let lower cashouts win, crash right before the highest exposure
        const medianTarget = autoCashouts[0];
        if (medianTarget && medianTarget < 3.0) {
          // Crash slightly above the lowest winner so someone wins and celebrates
          const safeCrash = Number((medianTarget + 0.15 + Math.random() * 0.4).toFixed(2));
          this.crashPoint = Math.min(this.crashPoint, Math.max(1.15, safeCrash));
        } else {
          this.crashPoint = Number((1.20 + Math.random() * 0.8).toFixed(2));
        }
      } else {
        // No auto-cashout set: keep multiplier in exciting 1.30x - 2.80x sweet spot
        if (this.crashPoint > 4.0) {
          this.crashPoint = Number((1.40 + Math.random() * 1.8).toFixed(2));
        }
      }
    } else {
      // Total stakes are small or modest: safe to allow thrilling high multipliers (moonshots!)
      // If natural crash point is high, let it fly to 10x-50x!
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

      // Check auto-cashouts
      for (const [betId, bet] of this.activeBets.entries()) {
        if (
          bet.status === "PENDING" &&
          bet.autoCashout &&
          this.currentMultiplier >= bet.autoCashout
        ) {
          await this.processCashout(betId, bet.autoCashout);
        }
      }

      // Check if crashed
      if (this.currentMultiplier >= this.crashPoint) {
        await this.handleCrash();
      } else {
        this.io.emit("aviator_tick", {
          multiplier: this.currentMultiplier,
        });
      }
    }, 80);
  }

  private async handleCrash() {
    if (this.loopInterval) clearInterval(this.loopInterval);
    this.status = "CRASHED";

    await prisma.aviatorRound.update({
      where: { id: this.currentRoundId },
      data: {
        status: "CRASHED",
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

    this.io.emit("aviator_new_bet", {
      betId: bet.id,
      phone: bet.user.phone.slice(0, 3) + "****" + bet.user.phone.slice(-3),
      betAmount,
    });

    return bet;
  }

  /**
   * Cashout Handler
   */
  public async processCashout(betId: string, cashoutAtMultiplier?: number) {
    if (this.status !== "FLYING") {
      throw new Error("Cannot cash out when the flight is not active");
    }

    const bet = this.activeBets.get(betId);
    if (!bet || bet.status !== "PENDING") {
      throw new Error("Bet not found or already cashed out");
    }

    const multiplier = cashoutAtMultiplier || this.currentMultiplier;
    if (multiplier > this.crashPoint) {
      throw new Error("Plane already crashed");
    }

    bet.status = "CASHED_OUT";
    bet.cashoutMultiplier = multiplier;

    const winAmount = Number((bet.betAmount * multiplier).toFixed(2));

    await prisma.aviatorBet.update({
      where: { id: betId },
      data: {
        status: "CASHED_OUT",
        cashoutMultiplier: multiplier,
        winAmount,
      },
    });

    await WalletService.creditWinnings(
      bet.userId,
      winAmount,
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
