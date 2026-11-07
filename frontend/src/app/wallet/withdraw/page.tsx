"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../lib/api";
import {
  ArrowLeft,
  ArrowUpFromLine,
  Building,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Zap,
  Lock,
  Percent,
} from "lucide-react";

interface TurnoverStatus {
  totalDeposits: number;
  totalWagered: number;
  remainingWager: number;
  isEligible: boolean;
  wageringPercentage: number;
  hasRecharged: boolean;
  minWagerRequired: number;
  turnoverDetails?: {
    firstRechargeCompleted: boolean;
    minGameTurnoverMet: boolean;
    depositTurnoverMet: boolean;
    rechargeMessage: string;
    wagerMessage: string;
  };
}

export default function WithdrawPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [withdrawAmount, setWithdrawAmount] = useState<number>(500);
  const [holderName, setHolderName] = useState<string>("");
  const [bankName, setBankName] = useState<string>("State Bank of India");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");

  const [turnover, setTurnover] = useState<TurnoverStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If user already has bank details saved, preload them + fetch turnover
  useEffect(() => {
    if (user) {
      apiRequest("/auth/me").then((res) => {
        if (res.user.bankAccounts && res.user.bankAccounts.length > 0) {
          const bank = res.user.bankAccounts[0];
          setHolderName(bank.accountHolderName || "");
          setBankName(bank.bankName || "State Bank of India");
          setAccountNumber(bank.accountNumber || "");
          setIfscCode(bank.ifscCode || "");
          setUpiId(bank.upiId || "");
        }
      });

      apiRequest<TurnoverStatus>("/wallet/turnover")
        .then(setTurnover)
        .catch(console.error);
    }
  }, [user]);

  const isAutoPayoutEligible = withdrawAmount <= 2000;

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (withdrawAmount < 100) {
      setErrorMsg("Minimum withdrawal amount is ₹100");
      return;
    }

    if (user.wallet.balance < withdrawAmount) {
      if (user.wallet.balance + (user.wallet.bonusBalance || 0) >= withdrawAmount) {
        setErrorMsg(
          `Withdrawal is only permitted from Real Cash (Available Real Cash: ₹${user.wallet.balance.toFixed(2)}). Bonus Wallet funds (₹${(user.wallet.bonusBalance || 0).toFixed(2)}) can be used in games (1:2 ratio with real cash) to win real withdrawable cash!`
        );
      } else {
        setErrorMsg(`Insufficient Real Cash balance. Current Real Cash: ₹${user.wallet.balance.toFixed(2)}`);
      }
      return;
    }

    if (!holderName) {
      setErrorMsg("Please enter the bank account holder name");
      return;
    }

    if (!accountNumber && !upiId) {
      setErrorMsg("Please provide either a Bank Account Number or a UPI ID");
      return;
    }

    if (turnover && !turnover.isEligible) {
      setErrorMsg(
        `Wagering requirement not met! You need to place ₹${turnover.remainingWager.toFixed(2)} more in trades before withdrawing.`
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Save bank account details
      await apiRequest("/wallet/bank-account", {
        method: "POST",
        body: JSON.stringify({
          accountHolderName: holderName,
          bankName,
          accountNumber,
          ifscCode,
          upiId,
        }),
      }).catch(() => {});

      // 2. Submit withdrawal with smart auto-payout routing
      const result = await apiRequest<{
        status: string;
        isAutoProcessed: boolean;
        payoutRef?: string;
        message: string;
      }>("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({
          amount: withdrawAmount,
          bankDetails: {
            accountHolderName: holderName,
            bankName,
            accountNumber,
            ifscCode,
            upiId,
          },
        }),
      });

      setSuccessMsg(
        result.message ||
          `Withdrawal request for ₹${withdrawAmount} submitted! Our payout desk will verify and transfer funds to your account shortly.`
      );

      refreshUser();
      setTimeout(() => {
        router.push("/wallet");
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 pb-20">
      {/* Header Back Button */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <Link href="/wallet" className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-extrabold text-white">Withdraw Funds</h1>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl text-center font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-xl text-center font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Available Balance Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex justify-between items-center">
        <div>
          <span className="text-[11px] text-slate-400 font-semibold uppercase block">
            Withdrawable Balance
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono">
            ₹{user?.wallet?.balance ? user.wallet.balance.toFixed(2) : "0.00"}
          </span>
        </div>
        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Payout Desk Active
        </span>
      </div>

      {/* Turnover & Withdrawal Verification Checklist */}
      {turnover && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Withdrawal Eligibility Checklist</span>
            </span>
            <span
              className={`font-mono text-xs font-black ${
                turnover.isEligible ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {turnover.isEligible ? "ELIGIBLE TO WITHDRAW" : "REQUIREMENTS PENDING"}
            </span>
          </div>

          {/* Condition 1: First Recharge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              {turnover.hasRecharged ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-bold text-slate-200 block">1. First Recharge (Min ₹100)</span>
                <span className="text-[10px] text-slate-400">
                  {turnover.hasRecharged
                    ? `Completed (Total Recharged: ₹${turnover.totalDeposits.toFixed(2)})`
                    : "Recharge required to activate bonus & withdrawals"}
                </span>
              </div>
            </div>
            {!turnover.hasRecharged && (
              <Link
                href="/wallet/recharge"
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 shadow"
              >
                Recharge Now
              </Link>
            )}
          </div>

          {/* Condition 2: Min ₹100 Game Bets Played */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              {turnover.totalWagered >= 100 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div>
                <span className="font-bold text-slate-200 block">2. Play Min ₹100 Game Bets</span>
                <span className="text-[10px] text-slate-400">
                  {turnover.totalWagered >= 100
                    ? `Completed (Total Played: ₹${turnover.totalWagered.toFixed(2)})`
                    : `Played ₹${turnover.totalWagered.toFixed(2)} / ₹100.00 required`}
                </span>
              </div>
            </div>
            {turnover.totalWagered < 100 && (
              <Link
                href="/games/wingo"
                className="bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 shadow"
              >
                Play Win Go
              </Link>
            )}
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-300">
              <span>Overall Turnover Progress</span>
              <span className="font-mono text-amber-400">{turnover.wageringPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  turnover.isEligible
                    ? "bg-gradient-to-r from-emerald-500 to-green-500"
                    : "bg-gradient-to-r from-amber-500 to-orange-500"
                }`}
                style={{ width: `${turnover.wageringPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Played: ₹{turnover.totalWagered.toFixed(2)}</span>
              <span>Target: ₹{turnover.minWagerRequired.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitWithdrawal} className="flex flex-col gap-4">
        {/* Withdrawal Amount */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Withdrawal Amount (Min ₹100)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-500 font-bold text-sm">₹</span>
            <input
              type="number"
              min="100"
              step="50"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          {/* Payout Desk Notice */}
          <div className="mt-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">
              <strong>Verified Payout Rail:</strong> Your request will be reviewed and transferred to your bank/UPI by our payout operations desk.
            </span>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white pb-2 border-b border-slate-800">
            <Building className="w-4 h-4 text-amber-400" />
            <span>Bank Account / UPI Details</span>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              Account Holder Full Name *
            </label>
            <input
              type="text"
              required
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="As per bank passbook"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC, SBI"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="SBIN0001234"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              Bank Account Number
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="10-18 digit account number"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="relative flex items-center justify-center my-1">
            <span className="px-2 bg-slate-900 text-slate-500 text-[10px] font-bold uppercase">
              OR Instant UPI
            </span>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              UPI ID (VPA)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Submit Withdrawal Button */}
        <button
          type="submit"
          disabled={loading || (turnover !== null && !turnover.isEligible)}
          className={`w-full py-3.5 rounded-xl font-black text-sm shadow-xl active:scale-98 transition flex items-center justify-center gap-2 ${
            turnover !== null && !turnover.isEligible
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-amber-950/40 hover:from-amber-400 hover:to-orange-400"
          }`}
        >
          {loading ? (
            "Submitting Request..."
          ) : turnover !== null && !turnover.isEligible ? (
            !turnover.hasRecharged ? (
              <span>🔒 First Recharge Required To Withdraw</span>
            ) : (
              <span>🔒 Play ₹{(100 - turnover.totalWagered).toFixed(0)} More in Games to Unlock</span>
            )
          ) : (
            <>
              <ArrowUpFromLine className="w-4 h-4" />
              <span>Submit Withdrawal Request ₹{withdrawAmount}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
