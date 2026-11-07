"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  Gift,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Zap,
  Users,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("invite");
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your password.");
      return;
    }

    if (!agreeTerms) {
      setError("Please certify you are 18+ and accept the platform rules");
      return;
    }

    setLoading(true);

    try {
      await register(
        phone,
        password,
        referralCode ? referralCode.trim() : undefined
      );
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col justify-center min-h-[85vh] max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-black text-black text-2xl shadow-xl shadow-amber-500/20 mb-3">
          S
        </div>
        <h1 className="text-2xl font-black text-white tracking-wide">Create Player Account</h1>
        <p className="text-slate-400 text-xs mt-1">
          Join 200,000+ players & claim your{" "}
          <span className="text-amber-400 font-bold">₹100 Signup Reward</span>!
        </p>
      </div>

      {/* Top Switcher: Login | Register */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-4">
        <Link
          href="/login"
          className="py-2 text-xs font-bold rounded-lg text-center text-slate-400 hover:text-white transition"
        >
          Password Login
        </Link>
        <div className="py-2 text-xs font-bold rounded-lg text-center bg-amber-500 text-black shadow">
          Register New
        </div>
      </div>

      {/* Referral Banner */}
      {referralCode ? (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 text-amber-300 text-xs p-3 rounded-2xl mb-4 flex items-center gap-2.5 animate-in fade-in">
          <Gift className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-white text-xs">
              🎁 ₹100 Welcome Bonus Active!
            </span>
            <span className="text-[11px] text-slate-300">
              Using invite code <strong className="font-mono text-amber-300">{referralCode}</strong>.
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 text-slate-300 text-xs p-3 rounded-2xl mb-4 flex items-center gap-2.5">
          <Gift className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px]">
            New players receive <strong className="text-amber-400">₹100 Instant Welcome Bonus</strong> upon registration!
          </span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Mobile Number Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Phone Number (Login ID)
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

        {/* Set Login Password */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Set Password (Min 6 Characters)
          </label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create account password"
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

        {/* Confirm Password */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Confirm Password
          </label>
          <div className="relative flex items-center">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`w-full bg-slate-900 border rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                confirmPassword && password !== confirmPassword
                  ? "border-rose-500"
                  : confirmPassword && password === confirmPassword
                  ? "border-emerald-500"
                  : "border-slate-700/80 focus:border-amber-400"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 text-slate-500 hover:text-slate-300"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password === confirmPassword && (
            <span className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Passwords match
            </span>
          )}
        </div>

        {/* Invitation / Referral Code */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Invitation Code (Optional)</span>
            <span className="text-[10px] text-amber-400 font-bold">+₹100 Welcome Cash</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. REF123XYZ"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase font-mono transition"
            />
            <Gift className="absolute right-3 w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* 18+ Agreement Checkbox */}
        <label className="flex items-start gap-2.5 text-[11px] text-slate-400 mt-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0"
          />
          <span>
            I certify I am 18+ years of age, a resident of India, and agree to the platform&apos;s{" "}
            <span className="text-amber-400 font-semibold">Terms of Service</span> &{" "}
            <span className="text-amber-400 font-semibold">Privacy Policy</span>.
          </span>
        </label>

        {/* Submit Register Button */}
        <button
          type="submit"
          disabled={loading || !agreeTerms}
          className="mt-2 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition disabled:opacity-50"
        >
          {loading ? (
            "Creating Your Account..."
          ) : (
            <>
              <span>
                {referralCode
                  ? "Register & Claim ₹100 Bonus"
                  : "Create Player Account"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Trust & Security Feature Badges */}
      <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-slate-800/80 text-center text-[10px] text-slate-400">
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-2.5 flex flex-col items-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
          <span className="font-bold text-slate-300">100% Safe</span>
          <span>Encrypted Vault</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-2.5 flex flex-col items-center">
          <Zap className="w-4 h-4 text-amber-400 mb-1" />
          <span className="font-bold text-slate-300">Instant Access</span>
          <span>5-Sec Signup</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-2.5 flex flex-col items-center">
          <Users className="w-4 h-4 text-sky-400 mb-1" />
          <span className="font-bold text-slate-300">200k+ Active</span>
          <span>Real Players</span>
        </div>
      </div>

      {/* Switch to Login */}
      <div className="mt-5 text-center text-xs text-slate-400">
        Already registered?{" "}
        <Link href="/login" className="text-amber-400 font-bold hover:underline">
          Log in here &rarr;
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
