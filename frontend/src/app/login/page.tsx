"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  AlertCircle,
  Headphones,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Submit Password Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!password) {
      setError("Please enter your account password");
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await login(phone, password);

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
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col justify-center min-h-[85vh] relative max-w-md mx-auto">
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

      {/* Top Switcher: Login | Register */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-5">
        <div className="py-2 text-xs font-bold rounded-lg text-center bg-amber-500 text-black shadow font-semibold">
          Password Login
        </div>
        <Link
          href="/register"
          className="py-2 text-xs font-bold rounded-lg text-center text-slate-400 hover:text-white transition flex items-center justify-center gap-1"
        >
          <span>Register New</span>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
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

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Login Password
            </label>
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
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
              placeholder="Enter your account password"
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
              <span>Login to Account</span>
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

      {/* Trust Badges */}
      <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>End-to-end encrypted 256-bit secure player authentication</span>
      </div>

      {/* Forgot Password Security Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Reset Account Password</h3>
                  <span className="text-[10px] text-slate-400 block">Security Verification</span>
                </div>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-300">
              <p className="leading-relaxed">
                To protect player wallets from unauthorized access, account password resets are verified directly by our security desk.
              </p>
              
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1 text-[11px]">
                <span className="text-slate-400">Required for reset:</span>
                <span className="text-white font-medium">• Your Registered Mobile Number</span>
                <span className="text-white font-medium">• Last Deposit / Withdrawal reference (if any)</span>
              </div>

              <a
                href="https://t.me/Raayanhere"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
              >
                <Headphones className="w-4 h-4" />
                <span>Contact Support (@Raayanhere)</span>
              </a>

              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-center text-xs text-slate-500 hover:text-slate-400 pt-1"
              >
                Cancel and return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
