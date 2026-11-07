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
  Clock,
} from "lucide-react";
import { getClientBankingHours, BankingHoursStatus } from "../../../lib/bankingHours";

interface TurnoverStatus {
  totalDeposits: number;
  totalWagered: number;
  remainingWager: number;
  isEligible: boolean;
  wageringPercentage: number;
  hasRecharged: boolean;
  minWagerRequired: number;
  bankingHours?: {
    isOpen: boolean;
    currentDay: string;
    currentISTTime: string;
    message: string;
    schedule: {
      mon_fri: string;
      sat: string;
      sun: string;
    };
  };
  turnoverDetails?: {
    firstRechargeCompleted: boolean;
    minGameTurnoverMet: boolean;
    depositTurnoverMet: boolean;
    isOneTimeActivationMet: boolean;
    rechargeMessage: string;
    wagerMessage: string;
  };
}

export default function WithdrawPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [withdrawAmount, setWithdrawAmount] = useState<number>(300);
  const [holderName, setHolderName] = useState<string>("");
  const [bankName, setBankName] = useState<string>("State Bank of India");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");

  const [turnover, setTurnover] = useState<TurnoverStatus | null>(null);
  // Instant deterministic client IST banking calculation on initial load
  const [bankingHours, setBankingHours] = useState<BankingHoursStatus>(getClientBankingHours);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poll banking hours every 10 seconds to keep live IST status in sync
  useEffect(() => {
    const timer = setInterval(() => {
      setBankingHours(getClientBankingHours());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

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

    if (!bankingHours.isOpen) {
      setErrorMsg(bankingHours.message);
      return;
    }

    if (withdrawAmount < 300) {
      setErrorMsg("Minimum withdrawal amount is ₹300");
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
      if (!turnover.hasRecharged) {
        setErrorMsg(
          "One-time activation required: Please make a first recharge of at least ₹100 before withdrawing."
        );
        return;
      }
      if (turnover.totalWagered < 100) {
        setErrorMsg(
          `One-time activation required: Please play ₹${(100 - turnover.totalWagered).toFixed(2)} more in games (Win Go / Aviator) to complete your account activation.`
        );
        return;
      }
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

      {/* Live Banking Hours Banner (Mon-Fri 9AM-9PM, Sat 9AM-4PM IST) */}
      <div
        className={`p-3.5 rounded-2xl border flex flex-col gap-2 shadow-md ${
          bankingHours.isOpen
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
            : "bg-gradient-to-br from-rose-950/80 via-slate-900 to-rose-950/50 border-2 border-rose-500/60 text-rose-300 shadow-rose-950/40"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock
              className={`w-4 h-4 shrink-0 ${
                bankingHours.isOpen ? "text-emerald-400" : "text-rose-400 animate-pulse"
              }`}
            />
            <div>
              <span className="font-extrabold block text-xs tracking-wide">
                {bankingHours.isOpen
                  ? "● Banking Services: OPEN"
                  : "⛔ WITHDRAWAL DESK CURRENTLY CLOSED"}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Mon–Fri: 9:00 AM – 9:00 PM | Sat: 9:00 AM – 4:00 PM IST | Sun: Closed
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-full font-mono ${
              bankingHours.isOpen
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
            }`}
          >
            {bankingHours.currentDay} {bankingHours.currentISTTime}
          </span>
        </div>

        {!bankingHours.isOpen && (
          <div className="pt-2 border-t border-rose-500/20 text-xs text-rose-200/90 flex flex-col gap-1">
            <p className="font-medium">{bankingHours.message}</p>
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mt-1">
              <span>Next Payout Window:</span>
              <span className="bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {bankingHours.nextOpeningText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Available Balance Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex justify-between items-center">
        <div>
          <span className="text-[11px] text-slate-400 font-semibold uppercase block">
            Withdrawable Balance (Real Cash)
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono">
            ₹{user?.wallet?.balance ? user.wallet.balance.toFixed(2) : "0.00"}
          </span>
        </div>
        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Payout Desk Active
        </span>
      </div>

      {/* One-Time Account Activation & Withdrawal Verification Card */}
      {turnover && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Withdrawal Eligibility Rule</span>
            </span>
            <span
              className={`font-mono text-[10px] font-black px-2 py-0.5 rounded-full ${
                turnover.isEligible
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              {turnover.isEligible ? "ACTIVATED & ELIGIBLE" : "ONE-TIME SETUP PENDING"}
            </span>
          </div>

          {turnover.isEligible ? (
            /* Eligible: One-Time Verification Passed */
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>One-Time Account Activation Complete!</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                Initial ₹100 recharge and ₹100 gameplay verified. You can now withdraw 100% of your Real Cash balance anytime during operating hours. (Bonus wallet cannot be withdrawn and is strictly for gameplay).
              </p>
            </div>
          ) : (
            /* Pending: Show the 2 One-time Steps */
            <>
              {/* Condition 1: First Recharge */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  {turnover.hasRecharged ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200 block">
                      1. One-Time First Recharge (Min ₹100)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {turnover.hasRecharged
                        ? `Completed (Total Recharged: ₹${turnover.totalDeposits.toFixed(2)})`
                        : "First recharge required to unlock withdrawals"}
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

              {/* Condition 2: Initial Gameplay ₹100 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  {turnover.totalWagered >= 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200 block">
                      2. Initial Gameplay (Min ₹100 Bets)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {turnover.totalWagered >= 100
                        ? `Completed (Played: ₹${turnover.totalWagered.toFixed(2)})`
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

              {/* Progress Bar for the Initial ₹100 */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                  <span>Activation Progress</span>
                  <span className="font-mono text-amber-400">
                    {Math.min(100, Math.floor((turnover.totalWagered / 100) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.floor((turnover.totalWagered / 100) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmitWithdrawal} className="flex flex-col gap-4">
        {/* Withdrawal Amount */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Withdrawal Amount (Min ₹300)
            </label>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              Min ₹300
            </span>
          </div>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-500 font-bold text-sm">₹</span>
            <input
              type="number"
              min="300"
              step="50"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          {/* Quick Amount Selectors */}
          <div className="grid grid-cols-6 gap-1.5 mt-2.5">
            {[300, 500, 1000, 2000, 5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setWithdrawAmount(amt)}
                className={`py-1 rounded-lg text-[11px] font-bold border transition ${
                  withdrawAmount === amt
                    ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20"
                    : "bg-slate-800/80 text-slate-300 border-slate-700/60 hover:border-slate-600"
                }`}
              >
                ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
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
          disabled={
            loading ||
            !bankingHours.isOpen ||
            (turnover !== null && !turnover.isEligible)
          }
          className={`w-full py-3.5 rounded-xl font-black text-sm shadow-xl active:scale-98 transition flex items-center justify-center gap-2 ${
            !bankingHours.isOpen || (turnover !== null && !turnover.isEligible)
              ? "bg-slate-800 text-rose-400 cursor-not-allowed border border-rose-500/30"
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-amber-950/40 hover:from-amber-400 hover:to-orange-400"
          }`}
        >
          {loading ? (
            "Submitting Request..."
          ) : !bankingHours.isOpen ? (
            <>
              <Lock className="w-4 h-4 text-rose-400" />
              <span>Closed: Reopens {bankingHours.nextOpeningText}</span>
            </>
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
