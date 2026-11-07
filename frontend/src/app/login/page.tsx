"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithOtp, sendOtp, resetPassword } = useAuth();

  // Mode: "PASSWORD" | "OTP"
  const [loginMode, setLoginMode] = useState<"PASSWORD" | "OTP">("PASSWORD");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP Timer
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotOtpPreview, setForgotOtpPreview] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  useEffect(() => {
    let timer: any;
    if (otpCooldown > 0) {
      timer = setInterval(() => setOtpCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    let timer: any;
    if (forgotCooldown > 0) {
      timer = setInterval(() => setForgotCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  // Send OTP for Quick Login
  const handleSendLoginOtp = async () => {
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await sendOtp(phone, "LOGIN");
      setSuccess(res.message);
      if (res.otpPreview) {
        setOtpPreview(res.otpPreview);
      }
      setOtpCooldown(45);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Submit Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let loggedUser;
      if (loginMode === "PASSWORD") {
        loggedUser = await login(phone, password);
      } else {
        if (!otp || otp.length !== 6) {
          setError("Please enter the 6-digit OTP");
          setLoading(false);
          return;
        }
        loggedUser = await loginWithOtp(phone, otp);
      }

      if (loggedUser?.role === "ADMIN") {
        router.push("/admin");
      } else if (loggedUser?.role === "STAFF_DEPOSIT") {
        router.push("/admin/deposits");
      } else if (loggedUser?.role === "STAFF_WITHDRAWAL") {
        router.push("/admin/withdrawals");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Send OTP for Forgot Password
  const handleSendForgotOtp = async () => {
    if (!forgotPhone || forgotPhone.length < 10) {
      setForgotError("Please enter your registered 10-digit phone number");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await sendOtp(forgotPhone, "RESET_PASSWORD");
      setForgotSuccess(res.message);
      if (res.otpPreview) {
        setForgotOtpPreview(res.otpPreview);
      }
      setForgotCooldown(45);
    } catch (err: any) {
      setForgotError(err.message || "Failed to send OTP");
    } finally {
      setForgotLoading(false);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotOtp || forgotOtp.length !== 6) {
      setForgotError("Please enter the 6-digit OTP code");
      return;
    }
    if (forgotNewPass.length < 6) {
      setForgotError("New password must be at least 6 characters");
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError("Passwords do not match");
      return;
    }

    setForgotLoading(true);
    try {
      const msg = await resetPassword(forgotPhone, forgotOtp, forgotNewPass);
      setForgotSuccess(msg);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setPhone(forgotPhone);
        setPassword(forgotNewPass);
        setLoginMode("PASSWORD");
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || "Failed to reset password");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col justify-center min-h-[85vh] relative">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-black text-black text-2xl shadow-xl shadow-amber-500/20 mb-3">
          S
        </div>
        <h1 className="text-2xl font-black text-white tracking-wide">Account Login</h1>
        <p className="text-slate-400 text-xs mt-1">
          Access your wallet, VIP prediction rooms & instant payouts
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => {
            setLoginMode("PASSWORD");
            setError("");
          }}
          className={`py-2 text-xs font-bold rounded-lg transition ${
            loginMode === "PASSWORD"
              ? "bg-amber-500 text-black shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Password Login
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode("OTP");
            setError("");
          }}
          className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            loginMode === "OTP"
              ? "bg-amber-500 text-black shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>OTP Quick Login</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification / Sandbox OTP preview */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span>{success}</span>
            {otpPreview && (
              <span className="block mt-0.5 font-mono font-bold text-amber-300">
                Sandbox OTP: {otpPreview}
              </span>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Phone Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Mobile Number
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-500 font-semibold text-xs border-r border-slate-700 pr-2">
              +91
            </span>
            <input
              type="tel"
              required
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="9876543210"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-16 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
            <Phone className="absolute right-3 w-4 h-4 text-slate-500" />
          </div>
        </div>

        {/* PASSWORD MODE: Password Input */}
        {loginMode === "PASSWORD" ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Login Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotPhone(phone);
                  setIsForgotModalOpen(true);
                  setForgotError("");
                  setForgotSuccess("");
                }}
                className="text-[11px] text-amber-400 hover:underline font-semibold"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          /* OTP MODE: OTP Input + Send Button */
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              6-Digit Verification Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
                <KeyRound className="absolute right-3 w-4 h-4 text-slate-500" />
              </div>

              <button
                type="button"
                disabled={otpCooldown > 0 || loading || !phone}
                onClick={handleSendLoginOtp}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 px-4 py-3 rounded-xl text-xs font-bold shrink-0 transition disabled:opacity-50"
              >
                {otpCooldown > 0 ? `${otpCooldown}s` : "Send OTP"}
              </button>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Tip: Developer sandbox test code is <strong className="font-mono text-white">123456</strong>
            </span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition disabled:opacity-50"
        >
          {loading ? (
            "Authenticating..."
          ) : (
            <>
              <span>{loginMode === "PASSWORD" ? "Login to Account" : "Verify OTP & Login"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-6 text-center text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-amber-400 font-bold hover:underline">
          Register & Claim ₹100 Bonus
        </Link>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Reset Password</h3>
                  <span className="text-[10px] text-slate-400 block">Verify with SMS OTP</span>
                </div>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {forgotSuccess}
                {forgotOtpPreview && (
                  <span className="block mt-0.5 font-mono font-bold text-amber-300">
                    OTP: {forgotOtpPreview}
                  </span>
                )}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  6-Digit OTP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter OTP"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    disabled={forgotCooldown > 0 || forgotLoading || !forgotPhone}
                    onClick={handleSendForgotOtp}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold px-3 py-2 rounded-xl transition disabled:opacity-50"
                  >
                    {forgotCooldown > 0 ? `${forgotCooldown}s` : "Get OTP"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  New Password (Min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={forgotConfirmPass}
                  onChange={(e) => setForgotConfirmPass(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="mt-2 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-98 transition disabled:opacity-50"
              >
                {forgotLoading ? "Resetting..." : "Confirm & Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
