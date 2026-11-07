"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gift, Share2, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-3 h-12 grid grid-cols-4 items-center">
      {/* 1. Home */}
      <Link
        href="/"
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          pathname === "/"
            ? "text-[#f2413b] font-black scale-105"
            : "text-slate-400 hover:text-slate-600 font-semibold"
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
            ? "text-[#f2413b] font-black scale-105"
            : "text-slate-400 hover:text-slate-600 font-semibold"
        }`}
      >
        <Gift className={`w-5 h-5 ${pathname === "/activity" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight leading-none mt-1">Activity</span>
      </Link>

      {/* 3. Promotion / Share */}
      <Link
        href="/promotion"
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          pathname === "/promotion"
            ? "text-[#f2413b] font-black scale-105"
            : "text-slate-400 hover:text-slate-600 font-semibold"
        }`}
      >
        <Share2 className={`w-5 h-5 ${pathname === "/promotion" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight leading-none mt-1">Promotion</span>
      </Link>

      {/* 4. Account / Login */}
      <Link
        href={user ? "/account" : "/login"}
        className={`flex flex-col items-center justify-center py-1 transition-all ${
          pathname === "/account" || pathname === "/login"
            ? "text-[#f2413b] font-black scale-105"
            : "text-slate-400 hover:text-slate-600 font-semibold"
        }`}
      >
        <UserIcon className={`w-5 h-5 ${pathname === "/account" || pathname === "/login" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
        <span className="text-[10px] tracking-tight leading-none mt-1">{user ? "Account" : "Login"}</span>
      </Link>
    </nav>
  );
};
