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
  Building,
  QrCode,
  LogOut,
  Clock,
  UserCheck,
  Phone,
  AlertTriangle,
} from "lucide-react";

interface PendingDeposit {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  utrNumber: string;
  createdAt: string;
  user: {
    id: string;
    phone: string;
    isFrozen?: boolean;
    wallet?: { balance: number };
  };
}

export default function DepositOperatorPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Reject modal
  const [rejectingTx, setRejectingTx] = useState<PendingDeposit | null>(null);
  const [rejectReason, setRejectReason] = useState("UTR not found in statement / invalid transaction");

  const isAuthorized =
    user && (user.role === "STAFF_DEPOSIT" || user.role === "STAFF" || user.role === "ADMIN");

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<PendingDeposit[]>("/admin/deposits");
      setDeposits(data);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to fetch deposits" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchDeposits();
    }
  }, [user]);

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleApprove = async (txId: string) => {
    if (!confirm("Confirm UTR verification and credit balance to player?")) return;
    setProcessingId(txId);
    setActionMsg(null);
    try {
      const res = await apiRequest<{ message: string; balance: number }>("/admin/deposits/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: txId }),
      });
      setActionMsg({ type: "success", text: res.message || "Deposit approved and balance credited!" });
      setDeposits((prev) => prev.filter((d) => d.id !== txId));
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to approve deposit" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTx) return;
    setProcessingId(rejectingTx.id);
    setActionMsg(null);
    try {
      const res = await apiRequest<{ message: string }>("/admin/deposits/reject", {
        method: "POST",
        body: JSON.stringify({
          transactionId: rejectingTx.id,
          reason: rejectReason,
        }),
      });
      setActionMsg({ type: "success", text: res.message || "Deposit rejected" });
      setDeposits((prev) => prev.filter((d) => d.id !== rejectingTx.id));
      setRejectingTx(null);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to reject deposit" });
    } finally {
      setProcessingId(null);
    }
  };

  if (!user || !isAuthorized) {
    return (
      <div className="p-8 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-3" />
        <h2 className="text-xl font-black text-white">Deposit Operator Privileges Required</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6 max-w-sm">
          You must be logged in with Deposit Operator privileges or Super Admin credentials to access this panel.
        </p>
        <Link
          href="/login"
          className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2.5 rounded-xl font-bold text-xs"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const filtered = deposits.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.user?.phone?.includes(q) ||
      d.utrNumber?.toLowerCase().includes(q) ||
      d.amount.toString().includes(q)
    );
  });

  const totalPendingAmount = deposits.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 text-slate-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <ArrowDownToLine className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Deposit Operator Station</h1>
              <p className="text-[11px] text-slate-400">
                Logged in as: <span className="font-mono text-amber-400">{user.phone}</span> ({user.role})
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2 rounded-xl font-bold border border-slate-700"
            >
              👑 Super Admin Panel
            </Link>
          )}
          <button
            onClick={fetchDeposits}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-2 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Gateway Verification Reference Box */}
      <div className="mt-4 p-3 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-purple-400" />
          <span className="text-slate-400">Payment Gateway:</span>
          <span className="font-mono font-bold text-white">PhonePe Merchant UPI</span>
        </div>
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">Official UPI ID:</span>
          <span className="font-mono font-bold text-amber-300">skmdfirdous@ybl</span>
        </div>
      </div>

      {/* Notification Toast */}
      {actionMsg && (
        <div
          className={`mt-4 p-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
            Pending Deposits
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{deposits.length}</span>
            <span className="text-[10px] text-slate-500 font-semibold">requests</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
            Pending Volume
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">₹{totalPendingAmount.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 font-semibold">total</span>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
            Operator Action
          </span>
          <span className="text-xs text-slate-300 font-medium mt-1">
            Check bank statement for matching UTR & click Approve.
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by 12-digit UTR, Phone number, or ₹ Amount..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-slate-400 hover:text-white px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Pending Deposits List */}
      <div className="mt-4 flex flex-col gap-3">
        {loading && deposits.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
            <span className="text-xs font-semibold">Loading pending deposits queue...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">All Deposits Cleared!</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending deposit requests waiting in the queue right now.
            </p>
          </div>
        ) : (
          filtered.map((d) => (
            <div
              key={d.id}
              className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-slate-700"
            >
              {/* Left: User & Amount Info */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-amber-400 font-mono">
                    ₹{d.amount.toLocaleString()}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                    {d.paymentMethod}
                  </span>
                  {d.user?.isFrozen && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      FROZEN
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1 font-mono text-white">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{d.user?.phone}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(d.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* UTR Box with 1-Click Copy */}
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UTR:</span>
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
                    <span className="font-mono font-black text-white text-xs tracking-wider select-all">
                      {d.utrNumber}
                    </span>
                    <button
                      onClick={() => handleCopyUtr(d.utrNumber)}
                      title="Copy UTR"
                      className="ml-1 text-slate-400 hover:text-amber-400 transition"
                    >
                      {copiedUtr === d.utrNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {copiedUtr === d.utrNumber && (
                    <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => setRejectingTx(d)}
                  disabled={processingId === d.id}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(d.id)}
                  disabled={processingId === d.id}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black text-xs font-extrabold shadow-lg shadow-emerald-950/40 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{processingId === d.id ? "Processing..." : "Approve & Credit"}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* REJECTION MODAL */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Reject Deposit Request</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  UTR: {rejectingTx.utrNumber} • ₹{rejectingTx.amount}
                </span>
              </div>
            </div>

            <form onSubmit={handleReject} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Reason for Rejection
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 mb-2"
                >
                  <option value="UTR not found in SBI account statement">
                    UTR not found in SBI account statement
                  </option>
                  <option value="Duplicate UTR number already claimed">
                    Duplicate UTR number already claimed
                  </option>
                  <option value="Amount mismatch with bank receipt">
                    Amount mismatch with bank receipt
                  </option>
                  <option value="Payment reversed or bounced by bank">
                    Payment reversed or bounced by bank
                  </option>
                  <option value="Custom">Custom note below...</option>
                </select>

                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection note shown to user..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setRejectingTx(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingTx.id}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40"
                >
                  {processingId === rejectingTx.id ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
