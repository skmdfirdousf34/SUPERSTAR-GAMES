"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../lib/api";
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  AlertCircle,
} from "lucide-react";

export default function RechargePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [amount, setAmount] = useState<number>(500);
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const DEMO_UPI = process.env.NEXT_PUBLIC_PAYMENT_UPI_ID || "imrajsk514-3@oksbi";
  const PAYEE_NAME = process.env.NEXT_PUBLIC_PAYMENT_NAME || "Sk Imraj";
  const BANK_ACC = process.env.NEXT_PUBLIC_ACCOUNT_NO || "43606293375";
  const BANK_IFSC = process.env.NEXT_PUBLIC_IFSC || "SBIN0012395";
  const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || "State Bank of India";
  const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_HOLDER_NAME || "Mr. Sk Asraf Ali";
  const BANK_BRANCH = process.env.NEXT_PUBLIC_BANK_BRANCH || "RASULPUR (Code: 12395)";

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(DEMO_UPI);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmitRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 100) {
      setErrorMsg("Minimum recharge amount is ₹100");
      return;
    }
    if (!utrNumber || utrNumber.length < 8) {
      setErrorMsg("Please enter a valid 12-digit UTR / Ref Number from your UPI app");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiRequest<{
        message: string;
        isAutoProcessed: boolean;
        transaction: any;
      }>("/wallet/recharge", {
        method: "POST",
        body: JSON.stringify({
          amount,
          paymentMethod: "UPI",
          utrNumber,
        }),
      });

      setSuccessMsg(
        res.isAutoProcessed
          ? `⚡ Auto-Verification Succeeded! ₹${amount} credited instantly to your wallet. UTR #${utrNumber} verified.`
          : res.message || "Recharge request submitted successfully!"
      );
      refreshUser();
      setTimeout(() => {
        router.push("/wallet");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit recharge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header Back Button */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <Link href="/wallet" className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-extrabold text-white">Recharge Balance</h1>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl text-center font-medium">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-xl text-center font-medium">
          {errorMsg}
        </div>
      )}

      {/* Preset Amount Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Select Recharge Amount (₹)
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {[100, 300, 500, 1000, 2000, 5000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmount(amt)}
              className={`py-3 rounded-xl font-black text-sm transition flex flex-col items-center justify-center ${
                amount === amt
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span>₹{amt}</span>
              <span className="text-[9px] opacity-75 font-normal">Fast Pay</span>
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="mt-3">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-500 font-bold text-sm">₹</span>
            <input
              type="number"
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Payment Gateway / UPI QR Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-white">
          <div className="flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Pay via UPI / QR Code</span>
          </div>
          <span className="text-emerald-400 text-[10px] font-bold">0% Fee</span>
        </div>

        {/* Official Google Pay QR Code */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner my-1">
          <div className="w-52 h-52 bg-white p-1 flex items-center justify-center rounded-xl overflow-hidden shadow">
            <img
              src="/images/sbi_qr.jpg"
              alt="Official GPay QR Code - Sk Imraj"
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                // Fallback to dynamic QR if image fails
                (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${DEMO_UPI}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amount}&cu=INR`;
              }}
            />
          </div>
          <span className="text-xs font-black text-black mt-2 font-mono">
            {PAYEE_NAME}
          </span>
          <span className="text-[10px] font-bold text-slate-600 font-mono">
            Scan with any UPI app to pay ₹{amount}
          </span>
        </div>

        {/* Copy UPI ID */}
        <div className="flex items-center justify-between bg-slate-800/80 rounded-xl p-2.5 border border-slate-700 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">
              Official UPI ID ({PAYEE_NAME})
            </span>
            <span className="font-mono font-bold text-amber-400 text-xs">{DEMO_UPI}</span>
          </div>
          <button
            onClick={handleCopyUpi}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold shadow"
          >
            {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUpi ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* 1-Tap Pay with UPI App Intent */}
        <a
          href={`upi://pay?pa=${DEMO_UPI}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amount}&cu=INR`}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-950/40 active:scale-98 transition"
        >
          <span>🚀 1-Tap Fast Pay (PhonePe / GPay / Paytm ₹{amount})</span>
        </a>

        {/* Direct Bank Account Transfer Option */}
        <div className="bg-slate-950/90 rounded-xl p-3 text-[11px] border border-slate-800 flex flex-col gap-1.5 font-mono">
          <div className="flex justify-between items-center text-slate-300 font-sans font-bold border-b border-slate-800/80 pb-1">
            <span>Direct Bank Transfer (IMPS / NEFT)</span>
            <span className="text-[10px] text-amber-400 font-bold">24x7</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Bank:</span>
            <span className="font-bold text-white">{BANK_NAME}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Branch:</span>
            <span className="font-bold text-slate-300">{BANK_BRANCH}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Account Holder:</span>
            <span className="font-bold text-white">{BANK_HOLDER}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Account No:</span>
            <span className="font-bold text-amber-400">{BANK_ACC}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">IFSC Code:</span>
            <span className="font-bold text-emerald-400">{BANK_IFSC}</span>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-slate-950/60 rounded-xl p-3 text-[11px] text-slate-400 flex flex-col gap-1">
          <span className="font-bold text-slate-300">How to complete recharge:</span>
          <span>1. Scan QR code or tap the Fast Pay button above.</span>
          <span>2. Complete payment of ₹{amount} in your UPI app.</span>
          <span>3. Copy the 12-digit UTR / Reference No. from payment receipt.</span>
          <span>4. Paste the 12-digit UTR below and submit — balance will be credited.</span>
        </div>
      </div>

      {/* UTR Form Submission */}
      <form onSubmit={handleSubmitRecharge} className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
            Enter 12-Digit UTR / Transaction Reference
          </label>
          <input
            type="text"
            required
            value={utrNumber}
            onChange={(e) => setUtrNumber(e.target.value.trim())}
            placeholder="e.g. 431289012345"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase tracking-widest"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 text-black py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-green-950/40 active:scale-98 transition disabled:opacity-50"
        >
          {loading ? "Verifying..." : `Submit Payment Proof (₹${amount})`}
        </button>
      </form>

      <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] pb-4">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Funds credited automatically upon receipt</span>
      </div>
    </div>
  );
}
