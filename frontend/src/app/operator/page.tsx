"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldAlert,
  ArrowLeft,
  Users,
  Lock,
} from "lucide-react";

export default function OperatorHubPage() {
  const { user } = useAuth();

  const isStaff =
    user && (user.role === "ADMIN" || user.role.startsWith("STAFF"));

  if (!user || !isStaff) {
    return (
      <div className="p-8 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-3" />
        <h2 className="text-xl font-black text-white">Staff Login Required</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Please login with a staff or operator account to view cashier desks.
        </p>
        <Link
          href="/login"
          className="bg-amber-500 text-black px-6 py-2.5 rounded-full font-bold text-xs"
        >
          Login Now
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4 pb-20">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <Link href="/" className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-base font-black text-white">Cashier & Staff Operations Hub</h1>
          <span className="text-[10px] text-slate-400">
            Select your assigned desk to manage transactions
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-2">
        {/* Desk 1: Deposit Operator */}
        <Link
          href="/operator/deposits"
          className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl shadow-xl flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>1. Deposit & Recharge Desk</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Verify incoming player UTRs against SBI Bank statement & approve recharges.
              </p>
              <span className="text-[9px] text-emerald-400 font-mono mt-1 inline-block">
                Role: STAFF_DEPOSIT
              </span>
            </div>
          </div>
        </Link>

        {/* Desk 2: Payout Operator */}
        <Link
          href="/operator/payouts"
          className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-rose-500/50 p-5 rounded-2xl shadow-xl flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
              <ArrowUpFromLine className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>2. Withdrawal & Payout Desk</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                View player bank/UPI details, transfer payouts & mark requests completed.
              </p>
              <span className="text-[9px] text-rose-400 font-mono mt-1 inline-block">
                Role: STAFF_WITHDRAWAL
              </span>
            </div>
          </div>
        </Link>

        {/* Master Admin Panel link (Only visible if owner/admin) */}
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            className="bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between mt-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-white block">
                  Master Super-Admin Panel (Owner Only)
                </span>
                <span className="text-[10px] text-slate-400">
                  Full financials, safe profit calculator, algorithms & user control.
                </span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
