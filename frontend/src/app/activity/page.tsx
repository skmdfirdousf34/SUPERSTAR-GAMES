"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import confetti from "canvas-confetti";
import {
  Gift,
  CalendarCheck,
  Sparkles,
  Trophy,
  Ticket,
  ChevronRight,
  Flame,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  Lock,
  Wallet,
  AlertCircle,
} from "lucide-react";

interface AttendanceStatus {
  todayDate: string;
  claimedToday: boolean;
  currentStreak: number;
  claimableDay: number | null;
  checkedDays: number[];
  msUntilReset: number;
  rewards: Record<number, number>;
}

export default function ActivityCenterPage() {
  const { user, refreshUser } = useAuth();

  // Attendance state from backend
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [claimLoading, setClaimLoading] = useState<boolean>(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Time remaining until tomorrow's reset (00:00:00 IST)
  const [countdownStr, setCountdownStr] = useState<string>("");

  // Gift Code state
  const [giftCode, setGiftCode] = useState<string>("");
  const [giftLoading, setGiftLoading] = useState<boolean>(false);
  const [giftMessage, setGiftMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Default 7-day attendance reward schedule
  const attendanceDays = [
    { day: 1, reward: "₹10", label: "Day 1" },
    { day: 2, reward: "₹20", label: "Day 2" },
    { day: 3, reward: "₹30", label: "Day 3" },
    { day: 4, reward: "₹50", label: "Day 4" },
    { day: 5, reward: "₹75", label: "Day 5" },
    { day: 6, reward: "₹100", label: "Day 6" },
    { day: 7, reward: "₹200", label: "Day 7", isJackpot: true },
  ];

  // Fetch real attendance status from backend
  const fetchAttendanceStatus = async () => {
    if (!user) return;
    try {
      const data = await apiRequest("/activity/attendance");
      setAttendance(data);
    } catch (err: any) {
      console.error("Error fetching attendance status:", err);
    }
  };

  useEffect(() => {
    fetchAttendanceStatus();
  }, [user]);

  // Live countdown timer until next reset (00:00:00 IST)
  useEffect(() => {
    if (!attendance || !attendance.claimedToday) {
      setCountdownStr("");
      return;
    }

    let remainingMs = attendance.msUntilReset;

    const updateTimer = () => {
      if (remainingMs <= 0) {
        setCountdownStr("00:00:00");
        fetchAttendanceStatus();
        return;
      }
      const totalSeconds = Math.floor(remainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n: number) => String(n).padStart(2, "0");
      setCountdownStr(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      remainingMs -= 1000;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [attendance]);

  // Handle Daily Attendance Check-in Claim
  const handleClaimCheckin = async () => {
    if (!user) {
      alert("Please login to claim your daily check-in attendance bonus!");
      return;
    }

    setClaimLoading(true);
    setClaimSuccess(null);
    setClaimError(null);

    try {
      const res = await apiRequest("/activity/attendance/claim", {
        method: "POST",
      });

      // Confetti celebration
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

      setClaimSuccess(res.message);
      // Immediately refresh user so wallet balance reflects the credited bonus
      await refreshUser();
      // Refresh attendance status to lock further claims today
      await fetchAttendanceStatus();
    } catch (err: any) {
      setClaimError(err.message || "Failed to claim attendance bonus");
    } finally {
      setClaimLoading(false);
    }
  };

  // Handle Gift Code Redemption
  const handleRedeemGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setGiftMessage({ type: "error", text: "Please log in to redeem member gift codes!" });
      return;
    }
    const cleanCode = giftCode.trim().toUpperCase();
    if (!cleanCode) {
      setGiftMessage({ type: "error", text: "Please enter a valid gift code" });
      return;
    }

    setGiftLoading(true);
    setGiftMessage(null);

    try {
      const res = await apiRequest("/activity/gift-code/redeem", {
        method: "POST",
        body: JSON.stringify({ code: cleanCode }),
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });
      setGiftMessage({ type: "success", text: res.message });
      setGiftCode("");
      await refreshUser();
    } catch (err: any) {
      setGiftMessage({ type: "error", text: err.message || "Failed to redeem code" });
    } finally {
      setGiftLoading(false);
    }
  };

  const checkedDays = attendance?.checkedDays || [];
  const claimedToday = attendance?.claimedToday ?? false;
  const claimableDay = attendance?.claimableDay ?? 1;

  return (
    <div className="flex flex-col gap-4 px-3 py-3 pb-24 select-none">
      {/* 1. Top Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-4 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-yellow-200 text-[10px] font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SUPERSTAR REWARD & ACTIVITY CENTER</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black leading-tight drop-shadow">
            BONUS & EVENTS <br />
            <span className="text-yellow-300">CLAIM FREE REWARDS</span>
          </h1>
          <p className="text-[11px] text-white/90 mt-1 max-w-[80%] font-medium">
            Daily attendance check-ins, VIP rebates, mission bounties, and exclusive gift codes!
          </p>
        </div>

        {/* Decorative Trophy Graphic */}
        <div className="absolute -right-3 -bottom-2 text-6xl opacity-30 pointer-events-none">
          🏆
        </div>
      </div>

      {/* 2. 7-Day Attendance Check-In Calendar (Daily Progress Enforced) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-wider">
                7-Day Attendance Sign-In
              </h2>
              <span className="text-[10px] text-slate-400 block">
                Sign in every day to claim increasing daily cash rewards! (1 claim/day)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {claimedToday ? (
              <span className="text-[10px] text-amber-400 font-bold font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Next in {countdownStr}</span>
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {checkedDays.length}/7 Days
              </span>
            )}
          </div>
        </div>

        {/* 7 Days Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1">
          {attendanceDays.map((item) => {
            const isClaimed = checkedDays.includes(item.day);
            const isReadyToClaim = !claimedToday && item.day === claimableDay;
            const isLocked = !isClaimed && !isReadyToClaim;

            return (
              <div
                key={item.day}
                className={`p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all relative ${
                  isClaimed
                    ? "bg-emerald-500/15 border border-emerald-500/50 text-emerald-300"
                    : isReadyToClaim
                    ? "bg-gradient-to-b from-amber-500/25 to-orange-500/15 border-2 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20 scale-105 animate-pulse"
                    : "bg-slate-950/80 border border-slate-800/80 text-slate-500"
                }`}
              >
                {/* Lock icon for future days */}
                {isLocked && (
                  <div className="absolute top-1 right-1 text-slate-500">
                    <Lock className="w-2.5 h-2.5" />
                  </div>
                )}

                <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
                <span className="text-lg my-1">
                  {isClaimed ? "✅" : isReadyToClaim ? "✨" : item.isJackpot ? "🎁" : "🪙"}
                </span>
                <span
                  className={`text-xs font-black font-mono ${
                    isClaimed
                      ? "text-emerald-400"
                      : isReadyToClaim
                      ? "text-amber-400"
                      : "text-slate-400"
                  }`}
                >
                  {item.reward}
                </span>

                <span
                  className={`text-[8px] font-black uppercase mt-0.5 px-1 rounded ${
                    isClaimed
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isReadyToClaim
                      ? "bg-amber-400 text-black"
                      : item.isJackpot
                      ? "text-yellow-400 font-bold"
                      : "text-slate-500"
                  }`}
                >
                  {isClaimed
                    ? "Claimed"
                    : isReadyToClaim
                    ? "Ready"
                    : item.isJackpot
                    ? "Jackpot"
                    : "Locked"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Success Alert */}
        {claimSuccess && (
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{claimSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {claimError && (
          <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-in zoom-in-95">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{claimError}</span>
          </div>
        )}

        {/* Claim Action Button (Daily Progress Enforced) */}
        {!user ? (
          <Link
            href="/login"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            <span>Log In to Claim Daily Attendance</span>
          </Link>
        ) : claimedToday ? (
          <div className="w-full py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              Claimed for Today! Next Reward Unlocks in{" "}
              <span className="font-mono text-amber-400 font-black">{countdownStr || "00:00:00"}</span>
            </span>
          </div>
        ) : (
          <button
            onClick={handleClaimCheckin}
            disabled={claimLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>
              {claimLoading
                ? "Crediting to Wallet..."
                : `Claim Day ${claimableDay} Attendance Reward (+₹${
                    attendance?.rewards?.[claimableDay] || attendanceDays[claimableDay - 1]?.reward || 10
                  })`}
            </span>
          </button>
        )}
      </div>

      {/* 3. Gift Code Redemption Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              Redeem Member Gift Code
            </h2>
            <span className="text-[10px] text-slate-400 block">
              Enter promotional codes shared on our official Telegram channel
            </span>
          </div>
        </div>

        <form onSubmit={handleRedeemGift} className="flex gap-2">
          <input
            type="text"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
            placeholder="e.g. SUPERSTAR100"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono tracking-wider"
          />
          <button
            type="submit"
            disabled={giftLoading || !giftCode.trim()}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 text-black text-xs font-black shadow-md transition disabled:opacity-50"
          >
            {giftLoading ? "Checking..." : "Redeem"}
          </button>
        </form>

        {giftMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-bold ${
              giftMessage.type === "success"
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/20 border border-rose-500/40 text-rose-300"
            }`}
          >
            {giftMessage.text}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
          <span>Tip: Try codes like &quot;SUPERSTAR100&quot; or &quot;WELCOME50&quot;</span>
          <a
            href="https://t.me/Raayanhere"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 font-bold hover:underline"
          >
            Telegram @Raayanhere &rarr;
          </a>
        </div>
      </div>

      {/* 4. Active Casino Events & Missions */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 px-1 text-xs font-black text-white">
          <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>Active Events & Bounties</span>
        </div>

        {/* Mission 1: First Recharge 100% Cash Match */}
        <Link
          href="/wallet/recharge"
          className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 hover:border-amber-400/60 rounded-2xl flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xl shadow-md">
              💰
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white group-hover:text-amber-400 transition">
                  100% First Deposit Match
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-[8px] font-black text-white">
                  HOT
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Deposit ₹500 or more & get ₹500 instant bonus cash!
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-amber-500 text-black text-[10px] font-black shadow flex items-center gap-0.5">
            Claim <ChevronRight className="w-3 h-3 stroke-[3]" />
          </span>
        </Link>

        {/* Mission 2: Win Go 3-Streak Master */}
        <Link
          href="/games/wingo"
          className="p-3.5 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/30 hover:border-rose-400/60 rounded-2xl flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-xl shadow-md">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white group-hover:text-rose-400 transition">
                  Win Go Color Prediction Streak
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-[8px] font-black text-black">
                  9X
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Predict Red, Green, or Violet in Win Go 30s!
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow flex items-center gap-0.5">
            Play <ChevronRight className="w-3 h-3 stroke-[3]" />
          </span>
        </Link>

        {/* Mission 3: Aviator High Altitude 10x */}
        <Link
          href="/games/aviator"
          className="p-3.5 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border border-red-500/30 hover:border-red-400/60 rounded-2xl flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-xl shadow-md">
              ✈️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white group-hover:text-red-400 transition">
                  Aviator 10x Altitude Hunter
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-[8px] font-black text-black">
                  100X+
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Cash out at 10.0x multiplier or higher for mega jackpot!
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-red-600 text-white text-[10px] font-black shadow flex items-center gap-0.5">
            Fly <ChevronRight className="w-3 h-3 stroke-[3]" />
          </span>
        </Link>

        {/* Mission 4: Refer & Earn ₹100 */}
        <Link
          href="/promotion"
          className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-xl shadow-md">
              👥
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white group-hover:text-emerald-400 transition">
                  Invite Friends & Earn ₹100
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-[8px] font-black text-black">
                  INSTANT
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Share referral code. You & your friend both get ₹100!
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-emerald-500 text-black text-[10px] font-black shadow flex items-center gap-0.5">
            Invite <ChevronRight className="w-3 h-3 stroke-[3]" />
          </span>
        </Link>
      </div>

      {/* 5. Trust & Fair Play Assurance */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center gap-2.5 text-slate-400 text-[10px]">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <span>
          All bonus rewards and activity check-ins are verified and credited directly to your playable wallet balance.
        </span>
      </div>
    </div>
  );
}
