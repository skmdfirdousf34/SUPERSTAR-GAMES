"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  Filter,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  utrNumber?: string;
  adminNote?: string;
  createdAt: string;
}

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"ALL" | "DEPOSIT" | "WITHDRAWAL" | "WINS">("ALL");

  useEffect(() => {
    if (!user) return;
    refreshUser();
    apiRequest<Transaction[]>("/wallet/transactions")
      .then(setTransactions)
      .catch((e) => console.error("Error fetching transactions", e));
  }, [user]);

  if (!user) {
    return (
      <div className="p-6 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <Wallet className="w-16 h-16 text-slate-600 mb-3" />
        <h2 className="text-xl font-bold text-white">Wallet Protected</h2>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Please login to manage your funds, deposits, and bank accounts.
        </p>
        <Link
          href="/login"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-black px-6 py-2.5 rounded-full font-bold text-xs shadow-lg shadow-amber-500/20"
        >
          Login Now
        </Link>
      </div>
    );
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "ALL") return true;
    if (filter === "DEPOSIT") return tx.type === "DEPOSIT";
    if (filter === "WITHDRAWAL") return tx.type === "WITHDRAWAL";
    if (filter === "WINS") return tx.type === "BET_WIN";
    return true;
  });

  return (
    <div className="p-4 flex flex-col gap-4 pb-20">
      {/* Wallet Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#121c2e] via-[#162238] to-[#0e1626] border border-slate-700/80 p-5 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Real Cash Balance (Withdrawable)
            </span>
            <div className="text-3xl font-black text-amber-400 mt-0.5 font-mono">
              ₹{user.wallet?.balance ? user.wallet.balance.toFixed(2) : "0.00"}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
              Bonus Wallet
            </span>
            <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
              ₹{user.wallet?.bonusBalance ? user.wallet.bonusBalance.toFixed(2) : "0.00"}
            </div>
          </div>
        </div>

        {/* 2:1 Ratio Bonus Rule Pill */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200/90 mb-3">
          <div className="font-bold flex items-center gap-1 text-amber-300">
            <span>🎁 Dual Wallet Benefit:</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[9px] font-black">1:2 Ratio</span>
          </div>
          <p className="text-[10px] text-slate-300 mt-0.5">
            Bonus is automatically applied up to 50% of real cash used (e.g. a ₹150 bet uses ₹100 Real + ₹50 Bonus). All bet winnings convert 100% into real withdrawable cash!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/60">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Total Recharged</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              ₹{user.wallet?.totalDeposit ? user.wallet.totalDeposit.toFixed(2) : "0.00"}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Total Withdrawn</span>
            <span className="text-sm font-black text-slate-300 font-mono">
              ₹{user.wallet?.totalWithdraw ? user.wallet.totalWithdraw.toFixed(2) : "0.00"}
            </span>
          </div>
        </div>

        {/* Financial Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Link
            href="/wallet/recharge"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 py-3 rounded-xl text-xs font-bold text-white shadow-lg shadow-green-950/40 active:scale-95 transition"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Recharge (Deposit)</span>
          </Link>
          <Link
            href="/wallet/withdraw"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 py-3 rounded-xl text-xs font-bold text-black shadow-lg shadow-amber-950/40 active:scale-95 transition"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Withdraw Money</span>
          </Link>
        </div>

        {/* First Recharge Notice if user has bonus but 0 deposits */}
        {user.wallet?.totalDeposit === 0 && (user.wallet?.balance || 0) > 0 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-amber-400 font-bold block">🎁 ₹100 Bonus Active</span>
              <span className="text-[10px] text-slate-300">
                Recharge min ₹100 & play ₹100 in games to unlock full betting & withdrawals.
              </span>
            </div>
            <Link
              href="/wallet/recharge"
              className="bg-amber-500 text-black px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 hover:bg-amber-400 shadow ml-2"
            >
              Recharge
            </Link>
          </div>
        )}
      </div>

      {/* Account Settings Shortcut Card */}
      <Link
        href="/account"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 shadow-lg flex items-center justify-between hover:border-slate-700 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Bank Account & Profile Settings</span>
            <span className="text-[10px] text-slate-400">View KYC, referral code & security password</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </Link>

      {/* Transactions & Ledger Hub */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <History className="w-4 h-4 text-amber-400" />
            <span>Financial Records</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredTransactions.length} records
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(["ALL", "DEPOSIT", "WITHDRAWAL", "WINS"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition shrink-0 ${
                filter === t
                  ? "bg-amber-500 text-black shadow"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t === "WINS" ? "Game Wins" : t}
            </button>
          ))}
        </div>

        {/* Transaction Rows */}
        <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white block">
                  {tx.type === "DEPOSIT"
                    ? "Deposit Recharge"
                    : tx.type === "WITHDRAWAL"
                    ? "Withdrawal Payout"
                    : tx.type === "BET_WIN"
                    ? "Game Winnings"
                    : "Game Bet"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {tx.utrNumber && (
                  <span className="block text-[9px] text-slate-400 font-mono">
                    UTR: {tx.utrNumber}
                  </span>
                )}
              </div>

              <div className="text-right">
                <span
                  className={`font-black font-mono block ${
                    tx.type === "DEPOSIT" || tx.type === "BET_WIN"
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {tx.type === "DEPOSIT" || tx.type === "BET_WIN" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    tx.status === "APPROVED" || tx.status === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : tx.status === "PENDING"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              No transactions found in this category.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] pb-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Bank-grade 256-bit transactional security</span>
      </div>
    </div>
  );
}
