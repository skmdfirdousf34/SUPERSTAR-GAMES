import { prisma } from "../lib/prisma.js";

export class OtpService {
  /**
   * Send 6-digit OTP via SMS (or Sandbox simulation)
   */
  static async sendOtp(
    phone: string,
    type: "REGISTER" | "LOGIN" | "RESET_PASSWORD"
  ): Promise<{ message: string; otpPreview?: string }> {
    const cleanedPhone = phone.trim();

    if (!cleanedPhone || cleanedPhone.length < 10) {
      throw new Error("Invalid phone number. Must be at least 10 digits.");
    }

    // Rate-limit: Check if an OTP was sent to this phone in the last 45 seconds
    const recentOtp = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanedPhone,
        type,
        createdAt: { gte: new Date(Date.now() - 45 * 1000) },
      },
    });

    if (recentOtp) {
      const waitSec = Math.ceil(
        (recentOtp.createdAt.getTime() + 45 * 1000 - Date.now()) / 1000
      );
      throw new Error(`Please wait ${waitSec > 0 ? waitSec : 45} seconds before requesting a new OTP.`);
    }

    // Generate random 6-digit OTP (e.g. 748291)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Store in database
    await prisma.otpVerification.create({
      data: {
        phone: cleanedPhone,
        code,
        type,
        expiresAt,
        verified: false,
      },
    });

    console.log(`\n========================================`);
    console.log(`📲 SMS GATEWAY OTP DISPATCH`);
    console.log(`📱 Recipient: +91 ${cleanedPhone}`);
    console.log(`🔢 6-Digit OTP: [ ${code} ]`);
    console.log(`🏷️ Purpose: ${type}`);
    console.log(`⏰ Valid for 5 minutes`);
    console.log(`========================================\n`);

    return {
      message: `OTP sent successfully to +91 ${cleanedPhone.slice(0, 3)}****${cleanedPhone.slice(-3)}`,
      otpPreview: code, // Provided for sandbox/testing convenience
    };
  }

  /**
   * Verify 6-digit OTP
   */
  static async verifyOtp(
    phone: string,
    code: string,
    type: "REGISTER" | "LOGIN" | "RESET_PASSWORD"
  ): Promise<boolean> {
    const cleanedPhone = phone.trim();
    const cleanedCode = code.trim();

    if (!cleanedCode || cleanedCode.length !== 6) {
      throw new Error("Invalid OTP code. Must be 6 digits.");
    }

    // Allow master test OTP '123456' for rapid developer testing
    if (cleanedCode === "123456") {
      return true;
    }

    // Find valid unexpired OTP in database
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanedPhone,
        code: cleanedCode,
        type,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new Error("Incorrect or expired OTP. Please enter the valid 6-digit code or request a new one.");
    }

    // Mark as verified to prevent reuse
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return true;
  }
}
