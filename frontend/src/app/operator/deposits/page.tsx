"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../lib/api";
import {
  ArrowDownToLine,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Copy,
  Check,
  ShieldAlert,
  ArrowLeft,
  Building,
} from "lucide-react";

interface PendingDeposit {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  utrNumber: string;
  createdAt: string;
  user: { id: string; phone: string; isFrozen?: boolean };
}

export default function DepositOperatorPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Rejection modal
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const isAuthorized =
    user && (user.role === "ADMIN" || user.role === "STAFF_DEPOSIT" || user.role === "STAFF");

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<PendingDeposit[]>("/admin/deposits");
      setDeposits(data);
    } catch (err: any) {
      console.error(err);
      setActionMsg(err.message || "Failed to load deposits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchDeposits();
    }
  }, [user]);

  if (!user || !isAuthorized) {
    return (
      <div className="p-8 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-3" />
        <h2 className="text-xl font-black text-white">Deposit Desk Access Required</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          You must be logged in with Deposit Operator privileges or Administrator credentials to view this desk.
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(text);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleApproveDeposit = async (transactionId: string) => {
    try {
      await apiRequest("/admin/deposits/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId }),
      });
      setActionMsg("Deposit approved and credited to player wallet!");
      fetchDeposits();
    } catch (err: any) {
      alert(err.message || "Approval failed");
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingTxId) return;
    try {
      await apiRequest("/admin/deposits/reject", {
        method: "POST",
        body: JSON.stringify({
          transactionId: rejectingTxId,
          reason: rejectionReason || "Invalid or unverified UTR reference",
        }),
      });
      setActionMsg("Deposit request rejected!");
      setRejectingTxId(null);
      setRejectionReason("");
      fetchDeposits();
    } catch (err: any) {
      alert(err.message || "Rejection failed");
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.user.phone.toLowerCase().includes(q) ||
      (d.utrNumber && d.utrNumber.toLowerCase().includes(q))
    );
  });

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
              <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
              <span>Deposit & Recharge Desk</span>
            </h1>
            <span className="text-[10px] text-slate-400">
              Logged in as: <strong className="text-amber-400">{user.phone}</strong> ({user.role})
            </span>
          </div>
        </div>

        <button
          onClick={fetchDeposits}
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

      {/* Target Account Reference for Staff */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] font-mono flex justify-between items-center text-slate-300">
        <div>
          <span className="text-[9px] text-slate-400 uppercase block font-sans font-bold">
            Receiving SBI Account
          </span>
          <span className="text-white font-bold">A/C: 43606293375 (Sk Imraj)</span>
          <span className="text-amber-400 block text-[10px]">UPI: imrajsk514-3@oksbi</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-400 uppercase block font-sans">Queue</span>
          <span className="text-base font-black text-emerald-400">{deposits.length} Pending</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3 text-slate-500" />
        <input
          type="text"
          placeholder="Search by phone number or 12-digit UTR..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
        />
      </div>

      {/* Pending Deposits List */}
      <div className="flex flex-col gap-3">
        {filteredDeposits.map((dep) => (
          <div
            key={dep.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3"
          >
            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="font-extrabold text-white font-mono text-sm block">
                  {dep.user.phone}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(dep.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="font-black text-emerald-400 font-mono text-lg">
                  +₹{dep.amount.toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-400 block font-semibold">
                  {dep.paymentMethod}
                </span>
              </div>
            </div>

            {/* UTR Box with Copy Button */}
            <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl font-mono border border-slate-800/80 flex justify-between items-center">
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5 font-sans">
                  Submitted 12-Digit UTR Number:
                </div>
                <div className="font-bold text-amber-400 text-xs">
                  {dep.utrNumber || "NOT PROVIDED"}
                </div>
              </div>
              {dep.utrNumber && (
                <button
                  type="button"
                  onClick={() => handleCopy(dep.utrNumber)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-[10px]"
                >
                  {copiedUtr === dep.utrNumber ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedUtr === dep.utrNumber ? "Copied" : "Copy"}</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setRejectingTxId(dep.id)}
                className="bg-slate-800 hover:bg-rose-950/40 border border-rose-500/40 text-rose-300 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject (Fake UTR)</span>
              </button>

              <button
                onClick={() => handleApproveDeposit(dep.id)}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-black py-2.5 rounded-xl text-xs font-black shadow-lg shadow-green-950/40 transition flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve & Credit ₹{dep.amount}</span>
              </button>
            </div>
          </div>
        ))}

        {filteredDeposits.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            {searchQuery ? `No deposits matching "${searchQuery}"` : "No pending recharge requests in queue."}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingTxId && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="font-extrabold text-sm text-rose-400 border-b border-slate-800 pb-2">
              Reject Recharge Request
            </h3>
            <p className="text-xs text-slate-300">
              Please enter the reason for rejection (e.g. UTR not found in bank statement, wrong amount).
            </p>
            <input
              type="text"
              placeholder="e.g. UTR not received in bank account"
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
