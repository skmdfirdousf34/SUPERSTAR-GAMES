"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import {
  User as UserIcon,
  Crown,
  Copy,
  Check,
  CreditCard,
  History,
  Shield,
  Headphones,
  FileText,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Wallet,
  Lock,
  Sparkles,
  ArrowDownToLine,
  Building,
  KeyRound,
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { user, logout, refreshUser, setSecurityPin } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Password change modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Security PIN modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Bank Card modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankSaving, setBankSaving] = useState(false);

  // Customer support modal
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      refreshUser();
      apiRequest("/auth/me").then((res) => {
        if (res.user.bankAccounts && res.user.bankAccounts.length > 0) {
          const bank = res.user.bankAccounts[0];
          setHolderName(bank.accountHolderName || "");
          setBankName(bank.bankName || "");
          setAccountNumber(bank.accountNumber || "");
          setIfscCode(bank.ifscCode || "");
          setUpiId(bank.upiId || "");
        }
      });
    }
  }, [user]);

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (user?.referralCode) {
      const url = `${window.location.origin}/register?ref=${user.referralCode}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holderName) {
      alert("Please enter account holder name");
      return;
    }
    setBankSaving(true);
    try {
      await apiRequest("/wallet/bank-account", {
        method: "POST",
        body: JSON.stringify({
          accountHolderName: holderName,
          bankName,
          accountNumber,
          ifscCode,
          upiId,
        }),
      });
      alert("Bank account details saved successfully!");
      setIsBankModalOpen(false);
      refreshUser();
    } catch (err: any) {
      alert(err.message || "Failed to save bank account");
    } finally {
      setBankSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "New passwords do not match", isError: true });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: "Password must be at least 6 characters", isError: true });
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg({ text: "Password changed successfully!", isError: false });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMsg(null);
      }, 1500);
    } catch (err: any) {
      setPasswordMsg({ text: err.message || "Failed to change password", isError: true });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinMsg({ text: "Security PIN must be exactly 6 digits (numbers only)", isError: true });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ text: "PINs do not match", isError: true });
      return;
    }

    setPinLoading(true);
    try {
      const msg = await setSecurityPin(newPin, currentPin || undefined);
      setPinMsg({ text: msg, isError: false });
      setTimeout(() => {
        setIsPinModalOpen(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
        setPinMsg(null);
      }, 1500);
    } catch (err: any) {
      setPinMsg({ text: err.message || "Failed to save security PIN", isError: true });
    } finally {
      setPinLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <UserIcon className="w-16 h-16 text-slate-600 mb-3" />
        <h2 className="text-xl font-bold text-white">Account Center</h2>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Please login to manage your profile, security, and rewards.
        </p>
        <Link
          href="/login"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-black px-6 py-2.5 rounded-full font-bold text-xs shadow-lg shadow-amber-500/20"
        >
          Login to Account
        </Link>
      </div>
    );
  }

  const maskedPhone = user.phone.slice(0, 3) + "****" + user.phone.slice(-3);
  const uid = user.id.slice(0, 8).toUpperCase();

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Profile Header Card */}
      <div className="rounded-2xl bg-gradient-to-r from-[#172238] via-[#1b2844] to-[#121c2e] border border-slate-700/80 p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-orange-500 p-0.5 shadow-lg shadow-amber-500/30">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black font-black text-[9px] px-1.5 py-0.2 rounded-full border border-black shadow">
              VIP 1
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-white tracking-wide">{maskedPhone}</h2>
              {user.role === "ADMIN" && (
                <span className="bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[9px] font-black px-1.5 py-0.5 rounded">
                  ADMIN
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">UID: {uid}</div>

            {/* Dual Balance chips */}
            <div className="mt-2 flex items-center justify-between bg-black/40 rounded-xl px-3 py-1.5 border border-slate-700/60">
              <div>
                <span className="text-[9px] text-slate-400 block font-medium">Real Cash</span>
                <span className="text-xs font-black text-amber-400 font-mono">
                  ₹{user.wallet?.balance ? user.wallet.balance.toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-amber-300 block font-medium">Bonus (1:2)</span>
                <span className="text-xs font-black text-amber-300 font-mono">
                  ₹{user.wallet?.bonusBalance ? user.wallet.bonusBalance.toFixed(2) : "0.00"}
                </span>
              </div>
              <Link
                href="/wallet/recharge"
                className="bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shadow ml-2"
              >
                <ArrowDownToLine className="w-3 h-3" /> Deposit
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-amber-500/10 rounded-full blur-xl" />
      </div>

      {/* Referral & Invite Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Invitation & Referral Rewards</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">₹100 / Invite</span>
        </div>

        <div className="flex items-center justify-between bg-slate-950/80 rounded-xl p-3 border border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              My Referral Code
            </span>
            <span className="font-mono font-black text-sm text-amber-400">
              {user.referralCode}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyReferralCode}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-black" /> : null}
              <span>{copiedLink ? "Link Copied" : "Share Link"}</span>
            </button>
          </div>
        </div>

        <Link
          href="/promotion"
          className="flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 transition"
        >
          <span>View Promotion Hub & Friends List</span>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </Link>
      </div>

      {/* Quick Action Menu Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg divide-y divide-slate-800">
        {/* Bank & Payout Binding */}
        <button
          onClick={() => setIsBankModalOpen(true)}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Bank Account & UPI</span>
              <span className="text-[10px] text-slate-400">
                {holderName ? `Bound: ${holderName}` : "Add bank card for fast withdrawals"}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Change Password */}
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Login Password</span>
              <span className="text-[10px] text-slate-400">Change account login password</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Withdrawal Security PIN */}
        <button
          onClick={() => {
            setIsPinModalOpen(true);
            setPinMsg(null);
          }}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Withdrawal Security PIN</span>
              <span className="text-[10px] text-slate-400">
                {user.hasSecurityPin
                  ? "Active (6-digit withdrawal protection)"
                  : "Not set (Tap to protect your bank payouts)"}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Bet History Shortcut */}
        <Link
          href="/games/wingo"
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Win Go Bet History</span>
              <span className="text-[10px] text-slate-400">View your parity predictions & profits</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </Link>

        {/* Aviator Bet History Shortcut */}
        <Link
          href="/games/aviator"
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Aviator Flight History</span>
              <span className="text-[10px] text-slate-400">View your crash rounds & multipliers</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </Link>

        {/* Customer Support */}
        <button
          onClick={() => setIsSupportModalOpen(true)}
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">24/7 Customer Support</span>
              <span className="text-[10px] text-slate-400">Telegram & live chat assistance</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Admin Dashboard (if admin) */}
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            className="w-full flex items-center justify-between p-3.5 bg-red-500/10 hover:bg-red-500/20 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-red-300 block">Admin Control Panel</span>
                <span className="text-[10px] text-red-400/80">Manage recharges, withdrawals, players</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </Link>
        )}
      </div>

      {/* Logout Action */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition shadow"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out Account</span>
      </button>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="font-extrabold text-base text-white mb-1">Change Password</h3>
            <p className="text-xs text-slate-400 mb-4">Ensure your account remains safe and secure.</p>

            {passwordMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs mb-3 text-center ${
                  passwordMsg.isError
                    ? "bg-rose-500/20 border border-rose-500/40 text-rose-300"
                    : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow transition disabled:opacity-50"
                >
                  {passwordLoading ? "Saving..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="font-extrabold text-base text-white mb-1">
              {user.hasSecurityPin ? "Update Withdrawal PIN" : "Set Withdrawal PIN"}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              A 6-digit numeric PIN protects your funds when withdrawing to bank or UPI.
            </p>

            {pinMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs mb-3 text-center ${
                  pinMsg.isError
                    ? "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                    : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                }`}
              >
                {pinMsg.text}
              </div>
            )}

            <form onSubmit={handleSavePin} className="flex flex-col gap-3">
              {user.hasSecurityPin && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Current PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter current 6-digit PIN"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  New 6-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 583921"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Confirm 6-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Repeat 6-digit PIN"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow transition disabled:opacity-50"
                >
                  {pinLoading ? "Saving..." : "Save PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Account Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="font-extrabold text-base text-white mb-1">Manage Bank Details</h3>
            <p className="text-xs text-slate-400 mb-4">Saved details are used for instant withdrawals.</p>

            <form onSubmit={handleSaveBank} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Full name as in bank"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. SBI / HDFC"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50100123456789"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  UPI ID (Alternative)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. user@okhdfcbank"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bankSaving}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow transition disabled:opacity-50"
                >
                  {bankSaving ? "Saving..." : "Save Bank Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center mb-3">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">24/7 Customer Care</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Need help with a deposit, withdrawal, or game round? Our support team is online 24/7.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 text-left text-xs font-mono">
              <div className="text-slate-400">Telegram Customer Care:</div>
              <div className="text-amber-400 font-bold text-sm">@Raayanhere</div>
              <div className="text-slate-400 mt-2">Support Email:</div>
              <div className="text-cyan-400 font-bold">support@superstar.club</div>
            </div>

            <a
              href="https://t.me/Raayanhere"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40 mb-2 active:scale-98 transition"
            >
              <span>💬 Open Chat with @Raayanhere</span>
            </a>

            <button
              onClick={() => setIsSupportModalOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
