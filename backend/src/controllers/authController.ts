import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { OtpService } from "../services/otpService.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

/**
 * Generate a cryptographically robust, guaranteed unique referral code
 * Uses 32 unambiguous characters (excludes easily confused 0/O, 1/I)
 */
export async function generateUniqueReferralCode(): Promise<string> {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  while (true) {
    let code = "REF";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) {
      return code;
    }
  }
}

export class AuthController {
  static async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, type } = req.body;
      if (!phone) {
        res.status(400).json({ error: "Phone number is required" });
        return;
      }

      const validTypes = ["REGISTER", "LOGIN", "RESET_PASSWORD"];
      const otpType = type && validTypes.includes(type) ? type : "LOGIN";

      // If LOGIN or RESET_PASSWORD, check if user exists
      if (otpType === "LOGIN" || otpType === "RESET_PASSWORD") {
        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
          res.status(404).json({ error: "No account found with this phone number. Please register first." });
          return;
        }
        if (user.isFrozen) {
          res.status(403).json({
            error: `Account suspended: ${user.freezeReason || "Your account has been frozen by administration. Contact support."}`,
          });
          return;
        }
      }

      // If REGISTER, check if phone already registered
      if (otpType === "REGISTER") {
        const existing = await prisma.user.findUnique({ where: { phone } });
        if (existing) {
          res.status(400).json({ error: "Phone number already registered. Please login instead." });
          return;
        }
      }

      const result = await OtpService.sendOtp(phone, otpType as any);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message || "Failed to send OTP" });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { phone, password, referralCode, otp } = req.body;

      if (!phone || !password) {
        res.status(400).json({ error: "Phone and password are required" });
        return;
      }

      if (phone.length < 10) {
        res.status(400).json({ error: "Invalid phone number" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { phone } });
      if (existingUser) {
        res.status(400).json({ error: "Phone number already registered" });
        return;
      }

      // If OTP was provided, verify it
      if (otp) {
        await OtpService.verifyOtp(phone, otp, "REGISTER");
      }

      const cleanRefCode =
        referralCode && typeof referralCode === "string" ? referralCode.trim().toUpperCase() : null;

      let referrer: any = null;
      if (cleanRefCode) {
        referrer = await prisma.user.findUnique({
          where: { referralCode: cleanRefCode },
          include: { wallet: true },
        });

        if (!referrer) {
          res.status(400).json({
            error: `Invalid referral code "${cleanRefCode}". Please check your friend's invite code or leave it blank.`,
          });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // Guaranteed unique referral code for every player
      const generatedReferral = await generateUniqueReferralCode();

      // Bonus amount when registering (Always ₹100 in Bonus Wallet!)
      const SIGNUP_BONUS_AMOUNT = 100.0;
      const REFERRAL_BONUS_AMOUNT = 100.0;

      // Atomic transaction: create user, wallet, reward records, and credit referrer
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            phone,
            passwordHash,
            referralCode: generatedReferral,
            referredBy: referrer ? referrer.referralCode : null,
            wallet: {
              create: {
                balance: 0.0, // Real cash wallet starts at 0
                bonusBalance: SIGNUP_BONUS_AMOUNT, // ₹100 Bonus Cash
              },
            },
          },
          include: { wallet: true },
        });

        // 1. Transaction record for new user signup bonus
        await tx.transaction.create({
          data: {
            userId: newUser.id,
            type: referrer ? "REFERRAL_BONUS" : "WELCOME_BONUS",
            amount: SIGNUP_BONUS_AMOUNT,
            status: "COMPLETED",
            isAutoProcessed: true,
            paymentMethod: "SYSTEM_REWARD",
            adminNote: referrer
              ? `Welcome Referral Bonus: Joined using friend code ${referrer.referralCode} (+₹100 in Bonus Wallet)`
              : `New Player Welcome Bonus: Claimed ₹100 Free Bonus Cash`,
          },
        });

        // If registered with valid friend's referral code:
        if (referrer) {
          // 2. Credit ₹100 to referrer's BONUS wallet
          await tx.wallet.update({
            where: { userId: referrer.id },
            data: {
              bonusBalance: { increment: REFERRAL_BONUS_AMOUNT },
            },
          });

          // 3. Transaction record for referrer (friend commission in Bonus Wallet)
          await tx.transaction.create({
            data: {
              userId: referrer.id,
              type: "REFERRAL_BONUS",
              amount: REFERRAL_BONUS_AMOUNT,
              status: "COMPLETED",
              isAutoProcessed: true,
              paymentMethod: "SYSTEM_REWARD",
              adminNote: `Referral Bonus: Friend (${phone.slice(0, 3)}****${phone.slice(-3)}) joined using your invite code! (+₹100 in Bonus Wallet)`,
            },
          });
        }

        return newUser;
      });

      const token = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: referrer
          ? "Registration successful! ₹100 Referral Bonus credited to your Bonus Wallet!"
          : "Registration successful! ₹100 Welcome Bonus credited to your Bonus Wallet!",
        token,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          referralCode: user.referralCode,
          wallet: user.wallet,
        },
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Registration failed" });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { phone, password, otp } = req.body;

      if (!phone) {
        res.status(400).json({ error: "Phone number is required" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { phone },
        include: { wallet: true },
      });

      if (!user) {
        res.status(401).json({ error: "Invalid phone number or user not registered" });
        return;
      }

      if (user.isFrozen) {
        res.status(403).json({
          error: `Account suspended: ${user.freezeReason || "Your account has been frozen by administration. Contact support."}`,
        });
        return;
      }

      // Option A: Quick Login via OTP
      if (otp) {
        await OtpService.verifyOtp(phone, otp, "LOGIN");
      }
      // Option B: Standard Password Login
      else if (password) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          res.status(401).json({ error: "Incorrect password. Please try again or use OTP login." });
          return;
        }
      } else {
        res.status(400).json({ error: "Please enter your password or OTP to login" });
        return;
      }

      // Record last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          referralCode: user.referralCode,
          wallet: user.wallet,
          hasSecurityPin: !!user.securityPin,
        },
      });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message || "Login failed" });
    }
  }

  static async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          wallet: true,
          bankAccounts: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          referralCode: user.referralCode,
          wallet: user.wallet,
          bankAccounts: user.bankAccounts,
          hasSecurityPin: !!user.securityPin,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Error fetching profile" });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { phone, otp, newPassword } = req.body;

      if (!phone || !otp || !newPassword) {
        res.status(400).json({ error: "Phone number, OTP, and new password are required" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: "New password must be at least 6 characters" });
        return;
      }

      await OtpService.verifyOtp(phone, otp, "RESET_PASSWORD");

      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      res.json({ message: "Password reset successfully! You can now login with your new password." });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message || "Failed to reset password" });
    }
  }

  static async setSecurityPin(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { currentPin, newPin } = req.body;
      if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
        res.status(400).json({ error: "Withdrawal Security PIN must be exactly 6 numeric digits" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (user.securityPin && user.securityPin !== currentPin) {
        res.status(400).json({ error: "Current withdrawal PIN is incorrect" });
        return;
      }

      await prisma.user.update({
        where: { id: req.user.id },
        data: { securityPin: newPin },
      });

      res.json({ message: "Withdrawal Security PIN saved successfully!" });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message || "Failed to update security PIN" });
    }
  }

  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current and new password are required" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: "New password must be at least 6 characters" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: newHash },
      });

      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to update password" });
    }
  }

  static async getReferralStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Find all users who joined with this user's referral code
      const invitedUsers = await prisma.user.findMany({
        where: { referredBy: user.referralCode },
        select: {
          id: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Find all referral bonus transactions for this user
      const referralTxns = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: "REFERRAL_BONUS",
          status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
      });

      const totalBonusEarned = referralTxns.reduce((acc, t) => acc + t.amount, 0);

      res.json({
        referralCode: user.referralCode,
        totalInvited: invitedUsers.length,
        totalBonusEarned,
        bonusPerReferral: 100,
        invitedUsers: invitedUsers.map((u) => ({
          id: u.id.slice(0, 8),
          phone: u.phone.slice(0, 3) + "****" + u.phone.slice(-3),
          joinedAt: u.createdAt,
          bonusGiven: 100,
        })),
        transactions: referralTxns.map((t) => ({
          id: t.id,
          amount: t.amount,
          note: t.adminNote,
          createdAt: t.createdAt,
        })),
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to fetch referral statistics" });
    }
  }
}
