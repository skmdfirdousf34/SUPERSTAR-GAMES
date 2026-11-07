import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }
};

export const checkNotFrozen = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role === "ADMIN") {
    next();
    return;
  }
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isFrozen: true, freezeReason: true },
    });
    if (dbUser?.isFrozen) {
      res.status(403).json({
        error: `Account suspended: ${dbUser.freezeReason || "Account frozen by platform administration"}. Contact customer support.`,
      });
      return;
    }
    next();
  } catch {
    next();
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

export const requireDepositStaffOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (
    !req.user ||
    (req.user.role !== "ADMIN" &&
      req.user.role !== "STAFF_DEPOSIT" &&
      req.user.role !== "STAFF")
  ) {
    res.status(403).json({ error: "Deposit operator or Admin access required" });
    return;
  }
  next();
};

export const requireWithdrawalStaffOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (
    !req.user ||
    (req.user.role !== "ADMIN" &&
      req.user.role !== "STAFF_WITHDRAWAL" &&
      req.user.role !== "STAFF")
  ) {
    res.status(403).json({ error: "Withdrawal operator or Admin access required" });
    return;
  }
  next();
};
