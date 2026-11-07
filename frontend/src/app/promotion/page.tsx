"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Coins,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Send,
  MessageCircle,
} from "lucide-react";

interface InvitedUser {
  id: string;
  phone: string;
  joinedAt: string;
  bonusGiven: number;
}

interface ReferralTxn {
  id: string;
  amount: number;
  note: string;
  createdAt: string;
}

interface ReferralStats {
  referralCode: string;
  totalInvited: number;
  totalBonusEarned: number;
  bonusPerReferral: number;
  invitedUsers: InvitedUser[];
  transactions: ReferralTxn[];
}

export default function PromotionPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (user) {
      apiRequest("/auth/referrals")
        .then((data) => setStats(data))
        .catch((err) => console.error("Error fetching referral stats:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const referralCode = stats?.referralCode || user?.referralCode || "";
  const inviteLink =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/register?ref=${referralCode}`
      : "";

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const shareWhatsApp = () => {
    const text = `🎁 Claim ₹100 FREE Signup Bonus on Superstar Club! Use my Invite Code: ${referralCode}\n\nRegister here: ${inviteLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareTelegram = () => {
    const text = `🎁 Claim ₹100 FREE Signup Bonus on Superstar Club! Use my Invite Code: ${referralCode}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  if (!user) {
    return (
      <div className="p-6 text-center min-h-[75vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <Gift className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white">Superstar Promotion Center</h2>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xs mb-6">
          Login to access your unique referral code, invite link, and earn ₹100 real cash for every friend!
        </p>
        <Link
          href="/login"
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95"
        >
          Login to View Referral Code
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 p-5 shadow-xl text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-amber-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Official Referral Program
          </div>
          <h1 className="text-2xl font-black leading-tight">
            REFER & EARN <br />
            <span className="text-yellow-300">₹100 REAL CASH</span>
          </h1>
          <p className="text-white/85 text-xs mt-1 font-medium">
            Every friend who registers with your code gets ₹100, and YOU also get ₹100 instantly!
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={shareWhatsApp}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition active:scale-95"
            >
              <MessageCircle className="w-4 h-4" /> Share on WhatsApp
            </button>
            <button
              onClick={shareTelegram}
              className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition active:scale-95"
            >
              <Send className="w-4 h-4" /> Telegram
            </button>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-yellow-300/20 rounded-full blur-2xl" />
      </div>

      {/* Referral Code & Share Link Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur flex flex-col gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Your Exclusive Referral Code
          </span>
          <div className="flex items-center justify-between bg-black/40 border border-slate-700/80 rounded-xl p-3">
            <span className="font-mono text-xl font-black text-amber-400 tracking-wider">
              {referralCode}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 shadow"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
            </button>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Direct Invitation Link
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-black/40 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate focus:outline-none"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Users className="w-4 h-4 text-sky-400" />
            <span>Invited Friends</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats ? stats.totalInvited : 0}
          </div>
          <span className="text-[10px] text-slate-400">Total registered players</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Bonus Earned</span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            ₹{stats ? stats.totalBonusEarned.toFixed(2) : "0.00"}
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">+₹100 per invite</span>
        </div>
      </div>

      {/* 3-Step Program Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>How The Referral Program Works</span>
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center mb-2">
              1
            </div>
            <span className="text-[11px] font-bold text-white">Share Link</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Send invite code or WhatsApp link</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center mb-2">
              2
            </div>
            <span className="text-[11px] font-bold text-white">Friend Joins</span>
            <span className="text-[9px] text-slate-400 mt-0.5">They get ₹100 instant bonus cash</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-300 font-black text-xs flex items-center justify-center mb-2">
              3
            </div>
            <span className="text-[11px] font-bold text-white">You Get ₹100</span>
            <span className="text-[9px] text-slate-400 mt-0.5">₹100 credited straight to your wallet</span>
          </div>
        </div>
      </div>

      {/* Invited Friends Record */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Invited Friends History</span>
          </h3>
          <span className="text-[10px] text-slate-400">
            {stats?.invitedUsers?.length || 0} Friends Total
          </span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-slate-500 text-xs">Loading invitation stats...</div>
        ) : !stats?.invitedUsers || stats.invitedUsers.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-slate-400">No friends invited yet.</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Share your invite link above and earn ₹100 on your first friend!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
            {stats.invitedUsers.map((friend) => (
              <div key={friend.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-xs text-slate-200 block">
                    {friend.phone}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(friend.joinedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-400">+₹{friend.bonusGiven}</span>
                  <span className="text-[9px] text-slate-400 block font-medium">Credited</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral Bonus Transactions */}
      {stats?.transactions && stats.transactions.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Bonus Credit Records</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold">100% Instant</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
            {stats.transactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between">
                <div className="max-w-[70%]">
                  <span className="text-xs font-semibold text-slate-200 block truncate">
                    {tx.note}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-400 font-mono">
                    +₹{tx.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Guarantee */}
      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 flex items-center gap-2.5 text-slate-400 text-[11px]">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <span>
          Referral bonuses are automatically credited in real-time with 0 delays. Share freely!
        </span>
      </div>
    </div>
  );
}
