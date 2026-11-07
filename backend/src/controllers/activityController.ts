import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { ActivityService } from "../services/activityService.js";

export class ActivityController {
  /**
   * GET /api/activity/attendance
   * Get attendance status & streak for logged-in user
   */
  static getAttendanceStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const status = await ActivityService.getAttendanceStatus(req.user.id);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /api/activity/attendance/claim
   * Claim today's attendance bonus
   */
  static claimAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await ActivityService.claimAttendance(req.user.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  /**
   * POST /api/activity/gift-code/redeem
   * Redeem official gift code
   */
  static redeemGiftCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ error: "Please provide a valid gift code" });
        return;
      }
      const result = await ActivityService.redeemGiftCode(req.user.id, code);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
