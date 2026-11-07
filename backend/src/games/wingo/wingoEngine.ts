import { Server } from "socket.io";
import { prisma } from "../../lib/prisma.js";
import { WalletService } from "../../services/walletService.js";

export type AlgorithmMode = "BALANCED_PROFIT" | "MAX_PROFIT" | "PURE_RANDOM";
export type WinGoModeKey = "30SEC" | "1MIN" | "3MIN" | "5MIN";
export type WinGoShortKey = "30S" | "1M" | "3M" | "5M";

export interface WinGoModeConfig {
  key: WinGoModeKey;
  shortKey: WinGoShortKey;
  durationSeconds: number;
  code: string;
  issuesPerDay: number;
  displayName: string;
}

export const WINGO_MODE_CONFIGS: Record<WinGoModeKey, WinGoModeConfig> = {
  "30SEC": {
    key: "30SEC",
    shortKey: "30S",
    durationSeconds: 30,
    code: "30",
    issuesPerDay: 2880,
    displayName: "WinGo 30sec",
  },
  "1MIN": {
    key: "1MIN",
    shortKey: "1M",
    durationSeconds: 60,
    code: "01",
    issuesPerDay: 1440,
    displayName: "WinGo 1Min",
  },
  "3MIN": {
    key: "3MIN",
    shortKey: "3M",
    durationSeconds: 180,
    code: "03",
    issuesPerDay: 480,
    displayName: "WinGo 3Min",
  },
  "5MIN": {
    key: "5MIN",
    shortKey: "5M",
    durationSeconds: 300,
    code: "05",
    issuesPerDay: 288,
    displayName: "WinGo 5Min",
  },
};

interface CandidateOutcome {
  number: number;
  color: string;
  size: string;
  totalPayout: number;
  houseProfit: number;
  houseMarginPercent: number;
  winningBetsCount: number;
}

/**
 * SingleWinGoModeEngine
 * Runs an isolated, independent countdown loop and round lifecycle for one specific game duration.
 */
export class SingleWinGoModeEngine {
  private io: Server;
  public config: WinGoModeConfig;
  public currentRoundId: string = "";
  public currentPeriod: string = "";
  public timeLeft: number = 30;
  public totalTime: number = 30;
  public isBettingOpen: boolean = true;
  private timer: NodeJS.Timeout | null = null;

  // Algorithm Control Settings
  public algorithmMode: AlgorithmMode = "BALANCED_PROFIT";
  public targetHouseMarginPercent: number = 25.0;

  constructor(io: Server, config: WinGoModeConfig) {
    this.io = io;
    this.config = config;
    this.timeLeft = config.durationSeconds;
    this.totalTime = config.durationSeconds;
  }

  public async start() {
    await this.initNextRound();
    this.startLoop();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Generates period matching official format with embedded mode code:
   * Format: YYYYMMDD + MODE_CODE(2 digits) + 4-digit sequence
   */
  public generatePeriodNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const secondsPassed = Math.floor((now.getTime() - midnight.getTime()) / 1000);

    let issueIndex = Math.floor(secondsPassed / this.config.durationSeconds) + 1;
    if (issueIndex > this.config.issuesPerDay) issueIndex = this.config.issuesPerDay;

    const issueSeq = String(issueIndex).padStart(4, "0");
    return `${dateStr}${this.config.code}${issueSeq}`;
  }

  private async initNextRound() {
    this.currentPeriod = this.generatePeriodNumber();
    this.totalTime = this.config.durationSeconds;
    this.timeLeft = this.config.durationSeconds;
    this.isBettingOpen = true;

    let round = await prisma.winGoRound.findUnique({
      where: { period: this.currentPeriod },
    });

    if (!round) {
      round = await prisma.winGoRound.create({
        data: {
          period: this.currentPeriod,
          gameType: this.config.key,
          status: "BETTING",
          startTime: new Date(),
          endTime: new Date(Date.now() + this.config.durationSeconds * 1000),
        },
      });
    }

    this.currentRoundId = round.id;

    const payload = {
      gameType: this.config.key,
      shortType: this.config.shortKey,
      period: this.currentPeriod,
      roundId: this.currentRoundId,
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
    };

    // Broadcast both generic and mode-specific socket events
    this.io.emit("wingo_new_round", payload);
    this.io.emit(`wingo_new_round_${this.config.shortKey}`, payload);
  }

  private startLoop() {
    this.timer = setInterval(async () => {
      this.timeLeft -= 1;

      // Lock betting during last 5 seconds
      if (this.timeLeft <= 5 && this.isBettingOpen) {
        this.isBettingOpen = false;
        try {
          await prisma.winGoRound.update({
            where: { id: this.currentRoundId },
            data: { status: "LOCKED" },
          });
        } catch (_) {}

        const lockPayload = {
          gameType: this.config.key,
          shortType: this.config.shortKey,
          period: this.currentPeriod,
          timeLeft: this.timeLeft,
        };

        this.io.emit("wingo_betting_locked", lockPayload);
        this.io.emit(`wingo_betting_locked_${this.config.shortKey}`, lockPayload);
      }

      // Broadcast tick every second
      const tickPayload = {
        gameType: this.config.key,
        shortType: this.config.shortKey,
        period: this.currentPeriod,
        timeLeft: Math.max(0, this.timeLeft),
        totalTime: this.totalTime,
        isBettingOpen: this.isBettingOpen,
      };

      this.io.emit("wingo_tick", tickPayload);
      this.io.emit(`wingo_tick_${this.config.shortKey}`, tickPayload);

      // When round ends (timeLeft <= 0)
      if (this.timeLeft <= 0) {
        if (this.timer) clearInterval(this.timer);
        await this.resolveRound();

        // 3-second display pause before starting next issue
        setTimeout(() => {
          this.initNextRound().then(() => this.startLoop());
        }, 3000);
      }
    }, 1000);
  }

  /**
   * Smart House Profit & Player Engagement Selection Algorithm
   */
  private selectSmartWinningNumber(bets: any[]): { winningNumber: number; winningColor: string; winningSize: string } {
    if (bets.length === 0 || this.algorithmMode === "PURE_RANDOM") {
      const randomNum = Math.floor(Math.random() * 10);
      return this.formatOutcome(randomNum);
    }

    const totalPool = bets.reduce((sum, b) => sum + b.betAmount, 0);
    const candidates: CandidateOutcome[] = [];

    for (let num = 0; num <= 9; num++) {
      const outcome = this.formatOutcome(num);
      let totalPayout = 0;
      let winningBetsCount = 0;

      for (const bet of bets) {
        const contractAmount = bet.betAmount * 0.98;
        let won = false;
        let mul = 0;

        if (bet.selectType === "COLOR") {
          if (bet.selectValue === "GREEN") {
            if ([1, 3, 7, 9].includes(num)) { won = true; mul = 2.0; }
            else if (num === 5) { won = true; mul = 1.5; }
          } else if (bet.selectValue === "RED") {
            if ([2, 4, 6, 8].includes(num)) { won = true; mul = 2.0; }
            else if (num === 0) { won = true; mul = 1.5; }
          } else if (bet.selectValue === "VIOLET") {
            if (num === 0 || num === 5) { won = true; mul = 4.5; }
          }
        } else if (bet.selectType === "NUMBER") {
          if (parseInt(bet.selectValue, 10) === num) { won = true; mul = 9.0; }
        } else if (bet.selectType === "SIZE") {
          if (bet.selectValue === "BIG" && num >= 5) { won = true; mul = 2.0; }
          else if (bet.selectValue === "SMALL" && num <= 4) { won = true; mul = 2.0; }
        }

        if (won) {
          totalPayout += contractAmount * mul;
          winningBetsCount++;
        }
      }

      const houseProfit = totalPool - totalPayout;
      const houseMarginPercent = totalPool > 0 ? (houseProfit / totalPool) * 100 : 100;

      candidates.push({
        number: num,
        color: outcome.winningColor,
        size: outcome.winningSize,
        totalPayout,
        houseProfit,
        houseMarginPercent,
        winningBetsCount,
      });
    }

    const profitableCandidates = candidates.filter((c) => c.houseProfit >= 0);

    if (this.algorithmMode === "BALANCED_PROFIT") {
      const winWinCandidates = profitableCandidates.filter(
        (c) => c.winningBetsCount > 0 && c.houseMarginPercent >= 15.0
      );

      if (winWinCandidates.length > 0) {
        const chosen = winWinCandidates[Math.floor(Math.random() * winWinCandidates.length)];
        return this.formatOutcome(chosen.number);
      }

      if (profitableCandidates.length > 0) {
        profitableCandidates.sort((a, b) => b.houseProfit - a.houseProfit);
        return this.formatOutcome(profitableCandidates[0].number);
      }
    } else if (this.algorithmMode === "MAX_PROFIT") {
      candidates.sort((a, b) => b.houseProfit - a.houseProfit);
      return this.formatOutcome(candidates[0].number);
    }

    return this.formatOutcome(Math.floor(Math.random() * 10));
  }

  private formatOutcome(winningNumber: number) {
    let winningColor = "GREEN";
    if ([2, 4, 6, 8].includes(winningNumber)) {
      winningColor = "RED";
    } else if (winningNumber === 0) {
      winningColor = "RED_VIOLET";
    } else if (winningNumber === 5) {
      winningColor = "GREEN_VIOLET";
    }

    const winningSize = winningNumber >= 5 ? "BIG" : "SMALL";
    return { winningNumber, winningColor, winningSize };
  }

  private async resolveRound() {
    let round;
    try {
      round = await prisma.winGoRound.findUnique({
        where: { id: this.currentRoundId },
        include: { bets: true },
      });
    } catch (e) {
      console.error(`[WinGo ${this.config.key}] Error fetching round bets:`, e);
      return;
    }

    if (!round) return;

    const { winningNumber, winningColor, winningSize } = this.selectSmartWinningNumber(round.bets);

    try {
      await prisma.winGoRound.update({
        where: { id: this.currentRoundId },
        data: {
          winningNumber,
          winningColor,
          winningSize,
          status: "COMPLETED",
        },
      });
    } catch (e) {
      console.error(`[WinGo ${this.config.key}] Error updating round in DB:`, e);
      return;
    }

    const resolvedBets = [];
    for (const bet of round.bets) {
      let won = false;
      let multiplier = 0;

      const contractAmount = Number((bet.betAmount * 0.98).toFixed(2));

      // Rule 1: Green
      if (bet.selectType === "COLOR" && bet.selectValue === "GREEN") {
        if ([1, 3, 7, 9].includes(winningNumber)) { won = true; multiplier = 2.0; }
        else if (winningNumber === 5) { won = true; multiplier = 1.5; }
      }
      // Rule 2: Red
      else if (bet.selectType === "COLOR" && bet.selectValue === "RED") {
        if ([2, 4, 6, 8].includes(winningNumber)) { won = true; multiplier = 2.0; }
        else if (winningNumber === 0) { won = true; multiplier = 1.5; }
      }
      // Rule 3: Violet
      else if (bet.selectType === "COLOR" && bet.selectValue === "VIOLET") {
        if (winningNumber === 0 || winningNumber === 5) { won = true; multiplier = 4.5; }
      }
      // Rule 4: Exact Number
      else if (bet.selectType === "NUMBER") {
        if (parseInt(bet.selectValue, 10) === winningNumber) { won = true; multiplier = 9.0; }
      }
      // Rule 5: Big
      else if (bet.selectType === "SIZE" && bet.selectValue === "BIG") {
        if (winningNumber >= 5) { won = true; multiplier = 2.0; }
      }
      // Rule 6: Small
      else if (bet.selectType === "SIZE" && bet.selectValue === "SMALL") {
        if (winningNumber <= 4) { won = true; multiplier = 2.0; }
      }

      const status = won ? "WON" : "LOST";
      const winAmount = won ? Number((contractAmount * multiplier).toFixed(2)) : 0;

      await prisma.winGoBet.update({
        where: { id: bet.id },
        data: {
          status,
          payoutMultiplier: multiplier,
          winAmount,
        },
      });

      if (won && winAmount > 0) {
        await WalletService.creditWinnings(
          bet.userId,
          winAmount,
          `${this.config.displayName} ${round.period} win: ${bet.selectValue} (Result: ${winningNumber}, Payout: ${multiplier}x)`
        );
      }

      resolvedBets.push({
        betId: bet.id,
        userId: bet.userId,
        status,
        contractAmount,
        multiplier,
        winAmount,
        selectValue: bet.selectValue,
      });
    }

    const resultPayload = {
      gameType: this.config.key,
      shortType: this.config.shortKey,
      period: this.currentPeriod,
      winningNumber,
      winningColor,
      winningSize,
      resolvedBets,
    };

    this.io.emit("wingo_round_result", resultPayload);
    this.io.emit(`wingo_round_result_${this.config.shortKey}`, resultPayload);
  }

  public async placeBet(
    userId: string,
    selectType: "COLOR" | "NUMBER" | "SIZE",
    selectValue: string,
    betAmount: number
  ) {
    if (!this.isBettingOpen || this.timeLeft <= 5) {
      throw new Error(`Betting is locked for current ${this.config.displayName} round. Please wait for next draw.`);
    }
    if (betAmount < 1) {
      throw new Error("Minimum trade amount is ₹1");
    }

    // Deduct wallet balance
    await WalletService.deductForBet(
      userId,
      betAmount,
      `${this.config.displayName} ${this.currentPeriod} trade: ${selectValue} (Amount: ₹${betAmount})`
    );

    const bet = await prisma.winGoBet.create({
      data: {
        userId,
        roundId: this.currentRoundId,
        selectType,
        selectValue,
        betAmount,
      },
    });

    const contractAmount = Number((betAmount * 0.98).toFixed(2));
    const serviceFee = Number((betAmount * 0.02).toFixed(2));

    return {
      ...bet,
      contractAmount,
      serviceFee,
      gameType: this.config.key,
      shortType: this.config.shortKey,
    };
  }

  public getState() {
    return {
      roundId: this.currentRoundId,
      period: this.currentPeriod,
      timeLeft: Math.max(0, this.timeLeft),
      totalTime: this.totalTime,
      isBettingOpen: this.isBettingOpen,
      gameType: this.config.key,
      shortType: this.config.shortKey,
      displayName: this.config.displayName,
    };
  }

  public updateAlgorithmSettings(mode: AlgorithmMode, targetMargin: number) {
    this.algorithmMode = mode;
    this.targetHouseMarginPercent = targetMargin;
  }
}

/**
 * WinGoEngine (Multi-Mode Orchestrator)
 * Manages 4 independent, concurrent Win Go game loops:
 * 1. 30SEC (30-second rounds, 2880 issues/day)
 * 2. 1MIN  (60-second rounds, 1440 issues/day)
 * 3. 3MIN  (180-second rounds, 480 issues/day)
 * 4. 5MIN  (300-second rounds, 288 issues/day)
 */
export class WinGoEngine {
  private io: Server;
  private engines: Map<WinGoModeKey, SingleWinGoModeEngine> = new Map();

  // Backward-compatibility properties mirroring the default 30SEC engine
  public get currentRoundId(): string {
    return this.getEngine("30SEC").currentRoundId;
  }
  public get currentPeriod(): string {
    return this.getEngine("30SEC").currentPeriod;
  }
  public get timeLeft(): number {
    return this.getEngine("30SEC").timeLeft;
  }
  public get totalTime(): number {
    return this.getEngine("30SEC").totalTime;
  }
  public get isBettingOpen(): boolean {
    return this.getEngine("30SEC").isBettingOpen;
  }
  public get gameType(): string {
    return "30SEC";
  }
  public get algorithmMode(): AlgorithmMode {
    return this.getEngine("30SEC").algorithmMode;
  }
  public get targetHouseMarginPercent(): number {
    return this.getEngine("30SEC").targetHouseMarginPercent;
  }

  constructor(io: Server) {
    this.io = io;
    // Instantiate all 4 independent engines
    const modeKeys: WinGoModeKey[] = ["30SEC", "1MIN", "3MIN", "5MIN"];
    for (const key of modeKeys) {
      const config = WINGO_MODE_CONFIGS[key];
      this.engines.set(key, new SingleWinGoModeEngine(io, config));
    }
  }

  /**
   * Normalize any input variant to valid WinGoModeKey
   */
  public normalizeModeKey(type?: string): WinGoModeKey {
    if (!type) return "30SEC";
    const cleaned = type.trim().toUpperCase();
    if (cleaned === "30S" || cleaned === "30SEC" || cleaned === "30SECOND" || cleaned === "30SECONDS") return "30SEC";
    if (cleaned === "1M" || cleaned === "1MIN" || cleaned === "1MINUTE" || cleaned === "60S") return "1MIN";
    if (cleaned === "3M" || cleaned === "3MIN" || cleaned === "3MINUTE" || cleaned === "180S") return "3MIN";
    if (cleaned === "5M" || cleaned === "5MIN" || cleaned === "5MINUTE" || cleaned === "300S") return "5MIN";
    return "30SEC";
  }

  public getEngine(type?: string): SingleWinGoModeEngine {
    const key = this.normalizeModeKey(type);
    const engine = this.engines.get(key);
    if (!engine) {
      return this.engines.get("30SEC")!;
    }
    return engine;
  }

  public async start() {
    console.log("⚡ Starting 4 Independent Win Go Game Engines (30s, 1Min, 3Min, 5Min)...");
    const promises: Promise<void>[] = [];
    for (const [key, engine] of this.engines.entries()) {
      promises.push(
        engine.start().then(() => {
          console.log(`✅ Win Go [${key}] Engine loop initiated successfully.`);
        })
      );
    }
    await Promise.all(promises);
  }

  public getState(type?: string) {
    return this.getEngine(type).getState();
  }

  public getAllStates() {
    const states: Record<string, any> = {};
    for (const [key, engine] of this.engines.entries()) {
      states[key] = engine.getState();
    }
    return states;
  }

  public async placeBet(
    userId: string,
    selectType: "COLOR" | "NUMBER" | "SIZE",
    selectValue: string,
    betAmount: number,
    gameType?: string
  ) {
    const engine = this.getEngine(gameType);
    return await engine.placeBet(userId, selectType, selectValue, betAmount);
  }

  public updateAlgorithmSettings(mode: AlgorithmMode, targetMargin: number) {
    for (const engine of this.engines.values()) {
      engine.updateAlgorithmSettings(mode, targetMargin);
    }
  }
}
