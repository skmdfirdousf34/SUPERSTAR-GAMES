import { Router } from "express";
import { GameController } from "../controllers/gameController.js";
import { authenticateToken, checkNotFrozen } from "../middleware/auth.js";
import { WinGoEngine } from "../games/wingo/wingoEngine.js";
import { AviatorEngine } from "../games/aviator/aviatorEngine.js";

export function createGameRoutes(wingoEngine: WinGoEngine, aviatorEngine: AviatorEngine) {
  const router = Router();
  const gameController = new GameController(wingoEngine, aviatorEngine);

  // Win Go public/authenticated endpoints
  router.get("/wingo/state", gameController.getWinGoState);
  router.get("/wingo/all-states", gameController.getWinGoAllStates);
  router.get("/wingo/history", gameController.getWinGoHistory);
  router.get("/wingo/my-bets", authenticateToken, gameController.getWinGoUserBets);
  router.post("/wingo/bet", authenticateToken, checkNotFrozen, gameController.placeWinGoBet);

  // Aviator public/authenticated endpoints
  router.get("/aviator/state", gameController.getAviatorState);
  router.get("/aviator/history", gameController.getAviatorHistory);
  router.get("/aviator/my-bets", authenticateToken, gameController.getAviatorUserBets);
  router.post("/aviator/bet", authenticateToken, checkNotFrozen, gameController.placeAviatorBet);
  router.post("/aviator/cashout", authenticateToken, checkNotFrozen, gameController.cashoutAviator);

  return router;
}
