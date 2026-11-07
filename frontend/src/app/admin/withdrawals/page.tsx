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
  Building,
  QrCode,
  LogOut,
  Clock,
  Phone,
  CreditCard,
  Wallet,
  ExternalLink,
} from "lucide-react";

interface PendingWithdrawal {
  id: string;
  userId: string;
  amount: number;
  createdAt: string;
  user: {
    id: string;
    phone: string;
    isFrozen?: boolean;
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

export default function WithdrawalOperatorPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Approval Modal with Payout UTR
  const [approvingTx, setApprovingTx] = useState<PendingWithdrawal | null>(null);
  const [payoutUtr, setPayoutUtr] = useState("");

  // Reject Modal with Reason
  const [rejectingTx, setRejectingTx] = useState<PendingWithdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState("Bank details incorrect or rejected by bank");

  const isAuthorized =
    user && (user.role === "STAFF_WITHDRAWAL" || user.role === "STAFF" || user.role === "ADMIN");

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<PendingWithdrawal[]>("/admin/withdrawals");
      setWithdrawals(data);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to fetch withdrawals" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchWithdrawals();
    }
  }, [user]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingTx) return;
    setProcessingId(approvingTx.id);
    setActionMsg(null);
    try {
      const res = await apiRequest<{ message: string; transaction: any }>("/admin/withdrawals/approve", {
        method: "POST",
        body: JSON.stringify({
          transactionId: approvingTx.id,
          utrNumber: payoutUtr || undefined,
        }),
      });
      setActionMsg({ type: "success", text: res.message || "Withdrawal approved and marked as paid!" });
      setWithdrawals((prev) => prev.filter((w) => w.id !== approvingTx.id));
      setApprovingTx(null);
      setPayoutUtr("");
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to approve withdrawal" });
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
      const res = await apiRequest<{ message: string; refundAmount: number }>("/admin/withdrawals/reject", {
        method: "POST",
        body: JSON.stringify({
          transactionId: rejectingTx.id,
          reason: rejectReason,
        }),
      });
      setActionMsg({
        type: "success",
        text: `${res.message || "Withdrawal rejected"}. ₹${res.refundAmount} refunded to user wallet.`,
      });
      setWithdrawals((prev) => prev.filter((w) => w.id !== rejectingTx.id));
      setRejectingTx(null);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to reject withdrawal" });
    } finally {
      setProcessingId(null);
    }
  };

  if (!user || !isAuthorized) {
    return (
      <div className="p-8 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-3" />
        <h2 className="text-xl font-black text-white">Withdrawal Operator Privileges Required</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6 max-w-sm">
          You must be logged in with Withdrawal Operator privileges or Super Admin credentials to access this panel.
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

  const filtered = withdrawals.filter((w) => {
    const q = searchQuery.toLowerCase();
    const bank = w.user?.bankAccounts?.[0];
    return (
      w.user?.phone?.includes(q) ||
      w.amount.toString().includes(q) ||
      bank?.accountNumber?.includes(q) ||
      bank?.upiId?.toLowerCase().includes(q) ||
      bank?.accountHolderName?.toLowerCase().includes(q)
    );
  });

  const totalPendingAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 text-slate-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ArrowUpFromLine className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Withdrawal Operator Station</h1>
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
            onClick={fetchWithdrawals}
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
            Pending Payouts
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{withdrawals.length}</span>
            <span className="text-[10px] text-slate-500 font-semibold">requests</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
            Payout Obligation
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">₹{totalPendingAmount.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 font-semibold">total</span>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
            Operator Action
          </span>
          <span className="text-xs text-slate-300 font-medium mt-1">
            Copy player bank or UPI details, send money via bank app, then mark approved.
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by phone number, bank account, UPI ID, or ₹ amount..."
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

      {/* Pending Withdrawals List */}
      <div className="mt-4 flex flex-col gap-3">
        {loading && withdrawals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
            <span className="text-xs font-semibold">Loading payout queue...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">All Payouts Dispatched!</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending withdrawal requests in the queue.
            </p>
          </div>
        ) : (
          filtered.map((w) => {
            const bank = w.user?.bankAccounts?.[0];
            return (
              <div
                key={w.id}
                className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg flex flex-col gap-3 transition hover:border-slate-700"
              >
                {/* Header: User & Amount */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-rose-400 font-mono">
                      ₹{w.amount.toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                      Requested Payout
                    </span>
                    {w.user?.isFrozen && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                        FROZEN
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1 font-mono text-white">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{w.user?.phone}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(w.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Bank / UPI Destination Box */}
                {bank ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                    {/* Bank Details */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <Building className="w-3.5 h-3.5 text-blue-400" />
                        <span>Bank Transfer</span>
                      </div>
                      <div className="text-slate-300">
                        <span className="text-slate-500">A/C Holder: </span>
                        <span className="font-bold text-white">{bank.accountHolderName}</span>
                      </div>
                      <div className="text-slate-300">
                        <span className="text-slate-500">Bank: </span>
                        <span className="font-semibold text-slate-200">{bank.bankName || "N/A"}</span>
                      </div>
                      {bank.accountNumber && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">A/C No: </span>
                          <span className="font-mono font-bold text-amber-300">{bank.accountNumber}</span>
                          <button
                            onClick={() => copyToClipboard(bank.accountNumber!, `acc-${w.id}`)}
                            title="Copy Account Number"
                            className="text-slate-400 hover:text-amber-400"
                          >
                            {copiedItem === `acc-${w.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                      {bank.ifscCode && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">IFSC: </span>
                          <span className="font-mono font-bold text-emerald-400">{bank.ifscCode}</span>
                          <button
                            onClick={() => copyToClipboard(bank.ifscCode!, `ifsc-${w.id}`)}
                            title="Copy IFSC"
                            className="text-slate-400 hover:text-emerald-400"
                          >
                            {copiedItem === `ifsc-${w.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* UPI Details */}
                    <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <QrCode className="w-3.5 h-3.5 text-amber-400" />
                        <span>UPI Option</span>
                      </div>
                      {bank.upiId ? (
                        <>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono font-bold text-amber-300 text-xs">
                              {bank.upiId}
                            </span>
                            <button
                              onClick={() => copyToClipboard(bank.upiId!, `upi-${w.id}`)}
                              title="Copy UPI ID"
                              className="text-slate-400 hover:text-amber-400"
                            >
                              {copiedItem === `upi-${w.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <a
                            href={`upi://pay?pa=${bank.upiId}&pn=${encodeURIComponent(
                              bank.accountHolderName
                            )}&am=${w.amount}&cu=INR`}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300"
                          >
                            <span>Open in UPI App (₹{w.amount})</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      ) : (
                        <span className="text-slate-500 text-xs italic">No UPI ID saved</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-semibold">
                    No bank account linked on file! Reject to refund user balance.
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setRejectingTx(w)}
                    disabled={processingId === w.id}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition disabled:opacity-50"
                  >
                    Reject & Refund
                  </button>
                  <button
                    onClick={() => {
                      setApprovingTx(w);
                      setPayoutUtr("");
                    }}
                    disabled={processingId === w.id}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black text-xs font-black shadow-lg shadow-emerald-950/40 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Transferred & Approve</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* APPROVAL / CONFIRM TRANSFER MODAL */}
      {approvingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Confirm Bank/UPI Transfer</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Player: {approvingTx.user?.phone} • ₹{approvingTx.amount}
                </span>
              </div>
            </div>

            <form onSubmit={handleApprove} className="mt-4 flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                Please verify that you have sent <strong className="text-amber-400">₹{approvingTx.amount}</strong> to the player via NetBanking or UPI.
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Bank Reference / UTR Number (Optional but recommended)
                </label>
                <input
                  type="text"
                  value={payoutUtr}
                  onChange={(e) => setPayoutUtr(e.target.value)}
                  placeholder="e.g. 431200987654"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setApprovingTx(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === approvingTx.id}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black text-xs font-black shadow-lg shadow-emerald-950/40"
                >
                  {processingId === approvingTx.id ? "Processing..." : "Confirm & Mark Paid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Reject & Refund Withdrawal</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Player: {rejectingTx.user?.phone} • ₹{rejectingTx.amount}
                </span>
              </div>
            </div>

            <form onSubmit={handleReject} className="mt-4 flex flex-col gap-3">
              <p className="text-xs text-slate-400">
                Rejecting this withdrawal will automatically refund <strong className="text-emerald-400">₹{rejectingTx.amount}</strong> back to the player&apos;s wallet balance.
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Reason for Rejection
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 mb-2"
                >
                  <option value="Bank details incorrect or rejected by bank">
                    Bank details incorrect or rejected by bank
                  </option>
                  <option value="IFSC Code does not match bank branch">
                    IFSC Code does not match bank branch
                  </option>
                  <option value="UPI ID invalid or inactive">
                    UPI ID invalid or inactive
                  </option>
                  <option value="Wagering requirement not completed">
                    Wagering requirement not completed
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
                  {processingId === rejectingTx.id ? "Rejecting..." : "Confirm Rejection & Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
