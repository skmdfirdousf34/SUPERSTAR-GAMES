"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { Wallet, PlusCircle, ShieldAlert, User as UserIcon, Sparkles, Gift } from "lucide-react";

export const Header: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#0e1626]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-black text-black text-lg shadow-lg shadow-amber-500/20">
          S
        </div>
        <div className="leading-tight">
          <span className="font-extrabold tracking-wider bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 bg-clip-text text-transparent text-sm">
            SUPERSTAR
          </span>
          <span className="block text-[10px] text-slate-400 tracking-widest font-semibold uppercase">
            GAMES CLUB
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 bg-[#121c2e] hover:bg-[#18253c] border border-slate-700/80 hover:border-amber-500/40 rounded-full px-2.5 py-1 text-xs shadow-md transition group"
              title={`Real Cash: ₹${user.wallet?.balance?.toFixed(2) ?? "0.00"} | Bonus: ₹${user.wallet?.bonusBalance?.toFixed(2) ?? "0.00"}`}
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-black font-mono tracking-tight text-xs">
                ₹{user.wallet?.balance ? user.wallet.balance.toFixed(2) : "0.00"}
              </span>
              {Boolean(user.wallet?.bonusBalance && user.wallet.bonusBalance > 0) && (
                <span
                  className="flex items-center gap-0.5 text-[9px] font-bold font-mono bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full"
                  title="Bonus Wallet (1:2 ratio)"
                >
                  <Gift className="w-2.5 h-2.5 text-amber-400" />
                  <span>₹{Math.floor(user.wallet.bonusBalance || 0)}</span>
                </span>
              )}
            </Link>

            <Link
              href="/wallet/recharge"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md shadow-amber-500/20 transition-transform active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </Link>

            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="bg-red-500/20 text-red-400 border border-red-500/40 p-1.5 rounded-full hover:bg-red-500/30 text-xs"
                title="Admin Dashboard"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </Link>
            )}
          </>
        ) : !loading ? (
          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full text-xs font-bold transition"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black px-3 py-1 rounded-full text-xs font-black shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-black" />
              <span>Sign Up</span>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
};
