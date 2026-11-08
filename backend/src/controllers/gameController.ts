import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { WinGoEngine } from "../games/wingo/wingoEngine.js";
import { AviatorEngine } from "../games/aviator/aviatorEngine.js";

export class GameController {
  private wingoEngine: WinGoEngine;
  private aviatorEngine: AviatorEngine;

  constructor(wingoEngine: WinGoEngine, aviatorEngine: AviatorEngine) {
    this.wingoEngine = wingoEngine;
    this.aviatorEngine = aviatorEngine;
  }

  // ===================== WIN GO =====================

  getWinGoState = async (req: AuthRequest, res: Response): Promise<void> => {
    const type = (req.query.type as string) || "30SEC";
    const engine = this.wingoEngine.getEngine(type);
    res.json(engine.getState());
  };

  getWinGoAllStates = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json(this.wingoEngine.getAllStates());
  };

  getWinGoHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const type = (req.query.type as string) || "30SEC";
      const normalizedType = this.wingoEngine.normalizeModeKey(type);

      const history = await prisma.winGoRound.findMany({
        where: {
          status: "COMPLETED",
          gameType: normalizedType,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getWinGoUserBets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const type = req.query.type as string;
      const whereClause: any = { userId: req.user.id };

      if (type) {
        const normalizedType = this.wingoEngine.normalizeModeKey(type);
        whereClause.round = { gameType: normalizedType };
      }

      const bets = await prisma.winGoBet.findMany({
        where: whereClause,
        include: { round: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      res.json(bets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  placeWinGoBet = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { selectType, selectValue, betAmount, gameType, type } = req.body;
      if (!selectType || !selectValue || !betAmount) {
        res.status(400).json({ error: "Missing required bet parameters" });
        return;
      }

      const targetMode = gameType || type || "30SEC";
      const bet = await this.wingoEngine.placeBet(
        req.user.id,
        selectType,
        selectValue,
        parseFloat(betAmount),
        targetMode
      );

      res.status(201).json({ message: "Bet placed successfully", bet });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  // ===================== AVIATOR =====================

  getAviatorState = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({
      roundId: this.aviatorEngine.currentRoundId,
      roundNumber: this.aviatorEngine.roundNumber,
      status: this.aviatorEngine.status,
      currentMultiplier: this.aviatorEngine.currentMultiplier,
      bettingCountdown: this.aviatorEngine.bettingCountdown,
    });
  };

  getAviatorHistory = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const history = await prisma.aviatorRound.findMany({
        where: { status: "CRASHED" },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          roundNumber: true,
          crashPoint: true,
          createdAt: true,
        },
      });
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getAviatorUserBets = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const bets = await prisma.aviatorBet.findMany({
        where: { userId: req.user.id },
        include: { round: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      res.json(bets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  placeAviatorBet = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { betAmount, autoCashout } = req.body;
      if (!betAmount) {
        res.status(400).json({ error: "Bet amount is required" });
        return;
      }

      const bet = await this.aviatorEngine.placeBet(
        req.user.id,
        parseFloat(betAmount),
        autoCashout ? parseFloat(autoCashout) : undefined
      );

      res.status(201).json({ message: "Aviator bet placed", bet });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  cashoutAviator = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { betId } = req.body;
      if (!betId) {
        res.status(400).json({ error: "betId is required" });
        return;
      }

      const result = await this.aviatorEngine.processCashout(betId, undefined, req.user.id);
      res.json({ message: "Successfully cashed out!", result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
