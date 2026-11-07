"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../lib/api";
import {
  ArrowUpFromLine,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Copy,
  Check,
  ShieldAlert,
  ArrowLeft,
  Zap,
} from "lucide-react";

interface PendingWithdrawal {
  id: string;
  userId: string;
  amount: number;
  createdAt: string;
  user: {
    id: string;
    phone: string;
    wallet?: { balance: number };
    bankAccounts: Array<{
      accountHolderName: string;
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      upiId: string;
    }>;
  };
}

export default function PayoutOperatorPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Rejection modal
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const isAuthorized =
    user && (user.role === "ADMIN" || user.role === "STAFF_WITHDRAWAL" || user.role === "STAFF");

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<PendingWithdrawal[]>("/admin/withdrawals");
      setWithdrawals(data);
    } catch (err: any) {
      console.error(err);
      setActionMsg(err.message || "Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchWithdrawals();
    }
  }, [user]);

  if (!user || !isAuthorized) {
    return (
      <div className="p-8 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-3" />
        <h2 className="text-xl font-black text-white">Payout Desk Access Required</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          You must be logged in with Payout Operator privileges or Administrator credentials to view this desk.
        </p>
        <Link
          href="/login"
          className="bg-amber-500 text-black px-6 py-2.5 rounded-full font-bold text-xs"
        >
          Login as Operator
        </Link>
      </div>
    );
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApproveWithdrawal = async (transactionId: string) => {
    try {
      await apiRequest("/admin/withdrawals/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId }),
      });
      setActionMsg("Withdrawal marked as successfully transferred!");
      fetchWithdrawals();
    } catch (err: any) {
      alert(err.message || "Approval failed");
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingTxId) return;
    try {
      await apiRequest("/admin/withdrawals/reject", {
        method: "POST",
        body: JSON.stringify({
          transactionId: rejectingTxId,
          reason: rejectionReason || "Withdrawal cancelled by payout operations",
        }),
      });
      setActionMsg("Withdrawal rejected and funds refunded to user wallet!");
      setRejectingTxId(null);
      setRejectionReason("");
      fetchWithdrawals();
    } catch (err: any) {
      alert(err.message || "Rejection failed");
    }
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const bank = w.user.bankAccounts[0];
    return (
      w.user.phone.toLowerCase().includes(q) ||
      (bank?.accountNumber && bank.accountNumber.toLowerCase().includes(q)) ||
      (bank?.upiId && bank.upiId.toLowerCase().includes(q)) ||
      (bank?.accountHolderName && bank.accountHolderName.toLowerCase().includes(q))
    );
  });

  const totalPendingAmount = withdrawals.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="p-4 flex flex-col gap-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-1.5">
              <ArrowUpFromLine className="w-4 h-4 text-rose-400" />
              <span>Withdrawal & Payout Desk</span>
            </h1>
            <span className="text-[10px] text-slate-400">
              Logged in as: <strong className="text-amber-400">{user.phone}</strong> ({user.role})
            </span>
          </div>
        </div>

        <button
          onClick={fetchWithdrawals}
          className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1.5"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="text-[10px] font-bold">Refresh</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl text-center font-bold flex items-center justify-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Summary Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] font-mono flex justify-between items-center text-slate-300">
        <div>
          <span className="text-[9px] text-slate-400 uppercase block font-sans font-bold">
            Pending Queue Value
          </span>
          <span className="text-lg font-black text-rose-400 font-mono">
            ₹{totalPendingAmount.toFixed(2)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-400 uppercase block font-sans font-bold">
            Total Requests
          </span>
          <span className="text-base font-black text-white">{withdrawals.length}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3 text-slate-500" />
        <input
          type="text"
          placeholder="Search by phone, UPI ID, or account number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
        />
      </div>

      {/* Pending Withdrawals List */}
      <div className="flex flex-col gap-3">
        {filteredWithdrawals.map((w) => {
          const bank = w.user.bankAccounts[0];
          return (
            <div
              key={w.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3"
            >
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-white font-mono text-sm block">
                    {w.user.phone}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(w.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-rose-400 font-mono text-lg">
                    -₹{w.amount.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    Bal left: ₹{w.user.wallet?.balance?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>

              {/* Bank Details Card with 1-Click Copy */}
              <div className="text-[11px] text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Account Holder:</span>
                  <span className="font-bold text-white">{bank?.accountHolderName || "N/A"}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Bank Name:</span>
                  <span>{bank?.bankName || "N/A"}</span>
                </div>

                {bank?.accountNumber && (
                  <div className="flex justify-between items-center border-t border-slate-800/60 pt-1">
                    <span className="text-slate-400">Acc No:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">{bank.accountNumber}</span>
                      <button
                        onClick={() => handleCopy(bank.accountNumber, `acc-${w.id}`)}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                        title="Copy Account Number"
                      >
                        {copiedKey === `acc-${w.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {bank?.ifscCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">IFSC Code:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">{bank.ifscCode}</span>
                      <button
                        onClick={() => handleCopy(bank.ifscCode, `ifsc-${w.id}`)}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                        title="Copy IFSC"
                      >
                        {copiedKey === `ifsc-${w.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {bank?.upiId && (
                  <div className="flex justify-between items-center border-t border-slate-800/60 pt-1">
                    <span className="text-slate-400">UPI ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">{bank.upiId}</span>
                      <button
                        onClick={() => handleCopy(bank.upiId, `upi-${w.id}`)}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                        title="Copy UPI ID"
                      >
                        {copiedKey === `upi-${w.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick 1-Tap UPI App Pay button for mobile staff */}
              {bank?.upiId && (
                <a
                  href={`upi://pay?pa=${bank.upiId}&pn=${encodeURIComponent(
                    bank.accountHolderName || "Player"
                  )}&am=${w.amount}&cu=INR`}
                  className="w-full py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open GPay / PhonePe to Pay ₹{w.amount}</span>
                </a>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setRejectingTxId(w.id)}
                  className="bg-slate-800 hover:bg-rose-950/40 border border-rose-500/40 text-rose-300 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject & Refund</span>
                </button>

                <button
                  onClick={() => handleApproveWithdrawal(w.id)}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-black py-2.5 rounded-xl text-xs font-black shadow-lg shadow-green-950/40 transition flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Transferred (Paid)</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredWithdrawals.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            {searchQuery
              ? `No payouts matching "${searchQuery}"`
              : "No pending payouts in queue. All user withdrawals cleared!"}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingTxId && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="font-extrabold text-sm text-rose-400 border-b border-slate-800 pb-2">
              Reject Withdrawal Request
            </h3>
            <p className="text-xs text-slate-300">
              This will decline the payout and refund the locked amount back to the player's wallet.
            </p>
            <input
              type="text"
              placeholder="e.g. Wrong bank account number or IFSC code"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setRejectingTxId(null);
                  setRejectionReason("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950/40"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
