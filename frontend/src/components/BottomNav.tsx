"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, Wallet, Share2, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide bottom navigation in full-bleed games and admin/operator panels to prevent button clipping
  if (
    pathname.startsWith("/games/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/operator")
  ) {
    return null;
  }

  const isWalletActive =
    pathname === "/wallet" ||
    pathname.startsWith("/wallet/recharge") ||
    pathname.startsWith("/wallet/withdraw");

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto bg-[#0e1626]/98 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] px-2 h-14 grid grid-cols-5 items-center select-none pb-[env(safe-area-inset-bottom,0px)]">
      {/* 1. Home */}
      <Link
        href="/"
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          pathname === "/"
            ? "text-[#fe5043] font-black scale-105"
            : "text-slate-400 hover:text-slate-200 font-semibold"
        }`}
      >
        <Home className={`w-5 h-5 ${pathname === "/" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight leading-none mt-1">Home</span>
      </Link>

      {/* 2. Activity / Rewards */}
      <Link
        href="/activity"
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          pathname === "/activity"
            ? "text-[#fe5043] font-black scale-105"
            : "text-slate-400 hover:text-slate-200 font-semibold"
        }`}
      >
        <Gift className={`w-5 h-5 ${pathname === "/activity" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight leading-none mt-1">Activity</span>
      </Link>

      {/* 3. Center Elevated Wallet (Deposit, Withdraw, Balance) */}
      <Link
        href="/wallet"
        className="flex flex-col items-center justify-center -mt-4 group relative"
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${
            isWalletActive
              ? "bg-gradient-to-tr from-amber-400 via-amber-500 to-orange-500 text-black shadow-amber-500/50 ring-2 ring-white/30"
              : "bg-gradient-to-tr from-[#fe5043] via-[#ff6854] to-[#f2413b] text-white shadow-red-500/40 border-2 border-[#0e1626]"
          }`}
        >
          <Wallet className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span
          className={`text-[10px] tracking-tight leading-none mt-1 font-bold ${
            isWalletActive ? "text-amber-400 font-black" : "text-slate-300"
          }`}
        >
          Wallet
        </span>
      </Link>

      {/* 4. Promotion / Share */}
      <Link
        href="/promotion"
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          pathname === "/promotion"
            ? "text-[#fe5043] font-black scale-105"
            : "text-slate-400 hover:text-slate-200 font-semibold"
        }`}
      >
        <Share2 className={`w-5 h-5 ${pathname === "/promotion" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight leading-none mt-1">Promotion</span>
      </Link>

      {/* 5. Account / Profile */}
      <Link
        href={user ? "/account" : "/login"}
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          pathname === "/account" || pathname === "/login"
            ? "text-[#fe5043] font-black scale-105"
            : "text-slate-400 hover:text-slate-200 font-semibold"
        }`}
      >
        <UserIcon className={`w-5 h-5 ${pathname === "/account" || pathname === "/login" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight leading-none mt-1">{user ? "Account" : "Login"}</span>
      </Link>
    </nav>
  );
};
