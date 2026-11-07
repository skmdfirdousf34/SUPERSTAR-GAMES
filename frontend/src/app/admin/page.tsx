"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";
import {
  ShieldAlert,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  PlusCircle,
  MinusCircle,
  ArrowLeft,
  Cpu,
  Percent,
  Sliders,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  CreditCard,
  History,
  Eye,
  Wallet,
  Building,
  Check,
  Ban,
  Calendar,
  Zap,
  Database,
  HardDrive,
  Download,
  FileSpreadsheet,
  Server,
  FileText,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalUserBalance: number;
  allTimeDeposits: number;
  allTimeWithdrawals: number;
  allTimeNetRevenue: number;
  todayRechargeAmount: number;
  todayRechargeCount: number;
  todayWithdrawalAmount: number;
  todayWithdrawalCount: number;
  todayNetProfit: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  pendingDepositsCount: number;
  pendingDepositsAmount: number;
  safeWithdrawableProfit: number;
}

interface PendingDeposit {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  utrNumber: string;
  createdAt: string;
  user: { id: string; phone: string; isFrozen?: boolean };
}

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

interface UserItem {
  id: string;
  phone: string;
  role: string;
  referralCode: string;
  isFrozen: boolean;
  freezeReason?: string;
  wallet?: {
    balance: number;
    totalDeposit: number;
    totalWithdraw: number;
  };
  bankAccounts?: Array<any>;
  _count?: {
    winGoBets: number;
    aviatorBets: number;
    transactions: number;
  };
  createdAt: string;
}

interface UserDetails extends UserItem {
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    paymentMethod?: string;
    utrNumber?: string;
    createdAt: string;
  }>;
  winGoBets: Array<{
    id: string;
    round: { period: string };
    selectType: string;
    selectValue: string;
    betAmount: number;
    winAmount: number;
    status: string;
    createdAt: string;
  }>;
  aviatorBets: Array<{
    id: string;
    round: { roundNumber: string; crashPoint: number };
    betAmount: number;
    cashoutMultiplier?: number;
    winAmount: number;
    status: string;
    createdAt: string;
  }>;
}

interface AlgorithmSettings {
  wingo: {
    mode: "BALANCED_PROFIT" | "MAX_PROFIT" | "PURE_RANDOM";
    targetHouseMarginPercent: number;
  };
  aviator: {
    mode: "BALANCED_PROFIT" | "CONSERVATIVE" | "PROVABLY_FAIR";
    maxAllowableRoundPayout: number;
  };
}

interface DataRetentionStats {
  retentionWindowDays: number;
  oldestRecordDate: string | null;
  totalDaysRetained: number;
  totalPlayers: number;
  totalRecharges: number;
  totalRechargeAmount: number;
  totalWithdrawals: number;
  totalWithdrawalAmount: number;
  totalWinGoRounds: number;
  totalWinGoBets: number;
  totalAviatorRounds: number;
  totalAviatorBets: number;
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
  totalBackups: number;
  latestBackup: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<
    "FINANCIALS" | "ALGORITHM" | "USERS" | "DEPOSITS" | "WITHDRAWALS" | "DATA_BACKUP"
  >("FINANCIALS");

  const [retentionStats, setRetentionStats] = useState<DataRetentionStats | null>(null);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");

  // Algorithm & Auto-payout state
  const [wingoMode, setWingoMode] = useState<string>("BALANCED_PROFIT");
  const [wingoMargin, setWingoMargin] = useState<number>(25);
  const [aviatorMode, setAviatorMode] = useState<string>("BALANCED_PROFIT");
  const [aviatorCap, setAviatorCap] = useState<number>(20000);
  const [autoPayoutLimit, setAutoPayoutLimit] = useState<number>(2000);
  const [savingAlgo, setSavingAlgo] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Manual balance adjust modal
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(500);
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustNote, setAdjustNote] = useState<string>("");

  // User Freeze modal
  const [freezeModalUser, setFreezeModalUser] = useState<UserItem | null>(null);
  const [freezeReason, setFreezeReason] = useState<string>("");

  // User Inspect Full Details modal
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [inspectedUser, setInspectedUser] = useState<UserDetails | null>(null);
  const [loadingInspection, setLoadingInspection] = useState<boolean>(false);

  // Rejection modal
  const [rejectingTx, setRejectingTx] = useState<{
    id: string;
    type: "DEPOSIT" | "WITHDRAWAL";
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, depositsData, withdrawalsData, usersData, algoData, payoutData, retentionData] =
        await Promise.all([
          apiRequest<AdminStats>("/admin/stats"),
          apiRequest<PendingDeposit[]>("/admin/deposits"),
          apiRequest<PendingWithdrawal[]>("/admin/withdrawals"),
          apiRequest<UserItem[]>("/admin/users"),
          apiRequest<AlgorithmSettings>("/admin/algorithm").catch(() => null),
          apiRequest<{ autoPayoutThreshold: number }>("/admin/payout-settings").catch(() => null),
          apiRequest<DataRetentionStats>("/admin/data-retention/stats").catch(() => null),
        ]);

      setStats(statsData);
      setDeposits(depositsData);
      setWithdrawals(withdrawalsData);
      setUsersList(usersData);

      if (algoData) {
        setWingoMode(algoData.wingo.mode);
        setWingoMargin(algoData.wingo.targetHouseMarginPercent);
        setAviatorMode(algoData.aviator.mode);
        setAviatorCap(algoData.aviator.maxAllowableRoundPayout);
      }
      if (payoutData?.autoPayoutThreshold) {
        setAutoPayoutLimit(payoutData.autoPayoutThreshold);
      }
      if (retentionData) {
        setRetentionStats(retentionData);
      }
    } catch (err: any) {
      console.error(err);
      setActionMsg(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await apiRequest<{
        message: string;
        backupFileName: string;
        backupSizeBytes: number;
        totalBackups: number;
      }>("/admin/data-retention/backup", { method: "POST" });
      setActionMsg(`✅ ${res.message} (${res.backupFileName})`);
      const updatedStats = await apiRequest<DataRetentionStats>("/admin/data-retention/stats").catch(() => null);
      if (updatedStats) setRetentionStats(updatedStats);
    } catch (err: any) {
      alert(err.message || "Failed to create database backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadCsv = async (type: string, filename: string) => {
    try {
      setExportLoading(type);
      const token = localStorage.getItem("token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
      const response = await fetch(`${apiUrl}/admin/data-retention/export?type=${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Failed to download audit CSV");
    } finally {
      setExportLoading(null);
    }
  };

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      fetchAdminData();
    }
  }, [user]);

  // Load detailed user inspector when requested
  useEffect(() => {
    if (!inspectUserId) {
      setInspectedUser(null);
      return;
    }
    setLoadingInspection(true);
    apiRequest<UserDetails>(`/admin/users/${inspectUserId}`)
      .then(setInspectedUser)
      .catch((err) => alert(err.message || "Failed to fetch user details"))
      .finally(() => setLoadingInspection(false));
  }, [inspectUserId]);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="p-8 text-center min-h-[70vh] flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-3" />
        <h2 className="text-xl font-black text-white">Admin Privileges Required</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          You must be logged in with Master Administrator credentials to view this master command hub.
        </p>
        <Link
          href="/login"
          className="bg-amber-500 text-black px-6 py-2.5 rounded-full font-bold text-xs"
        >
          Login as Admin
        </Link>
      </div>
    );
  }

  // Deposit Actions
  const handleApproveDeposit = async (transactionId: string) => {
    try {
      await apiRequest("/admin/deposits/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId }),
      });
      setActionMsg("Deposit approved and credited!");
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Approval failed");
    }
  };

  const handleConfirmRejectDeposit = async () => {
    if (!rejectingTx) return;
    try {
      await apiRequest("/admin/deposits/reject", {
        method: "POST",
        body: JSON.stringify({
          transactionId: rejectingTx.id,
          reason: rejectionReason || "Fake or unverified UTR reference",
        }),
      });
      setActionMsg("Deposit rejected!");
      setRejectingTx(null);
      setRejectionReason("");
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Rejection failed");
    }
  };

  // Withdrawal Actions
  const handleApproveWithdrawal = async (transactionId: string) => {
    try {
      await apiRequest("/admin/withdrawals/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId }),
      });
      setActionMsg("Withdrawal marked as successfully transferred!");
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Approval failed");
    }
  };

  const handleConfirmRejectWithdrawal = async () => {
    if (!rejectingTx) return;
    try {
      await apiRequest("/admin/withdrawals/reject", {
        method: "POST",
        body: JSON.stringify({
          transactionId: rejectingTx.id,
          reason: rejectionReason || "Withdrawal cancelled by administration",
        }),
      });
      setActionMsg("Withdrawal rejected and funds refunded to user wallet!");
      setRejectingTx(null);
      setRejectionReason("");
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Rejection failed");
    }
  };

  // User Actions: Balance adjust
  const handleAdjustBalance = async () => {
    if (!selectedUserForBalance) return;
    try {
      await apiRequest("/admin/users/adjust-balance", {
        method: "POST",
        body: JSON.stringify({
          userId: selectedUserForBalance.id,
          amount: adjustAmount,
          type: adjustType,
          note: adjustNote || `Admin manual ${adjustType.toLowerCase()}`,
        }),
      });
      setSelectedUserForBalance(null);
      setAdjustNote("");
      setActionMsg("User balance updated successfully!");
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to adjust balance");
    }
  };

  // User Actions: Freeze / Unfreeze
  const handleConfirmToggleFreeze = async () => {
    if (!freezeModalUser) return;
    try {
      const res = await apiRequest<{ message: string }>("/admin/users/freeze", {
        method: "POST",
        body: JSON.stringify({
          userId: freezeModalUser.id,
          reason: freezeReason || "Suspicious activity or disciplinary review",
        }),
      });
      setActionMsg(res.message);
      setFreezeModalUser(null);
      setFreezeReason("");
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle freeze state");
    }
  };

  // Algorithm & Auto-Payout Save
  const handleSaveAlgorithm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAlgo(true);
    setActionMsg(null);
    try {
      await Promise.all([
        apiRequest("/admin/algorithm", {
          method: "POST",
          body: JSON.stringify({
            wingoMode,
            wingoMargin,
            aviatorMode,
            aviatorCap,
          }),
        }),
        apiRequest("/admin/payout-settings", {
          method: "POST",
          body: JSON.stringify({
            autoPayoutThreshold: autoPayoutLimit,
          }),
        }),
      ]);
      setActionMsg(`✅ Settings saved! Auto-Payout threshold active for ≤ ₹${autoPayoutLimit}.`);
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSavingAlgo(false);
    }
  };

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.phone.toLowerCase().includes(q) ||
      u.referralCode.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 flex flex-col gap-4 pb-20">
      {/* Admin Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Master Admin Command Hub</span>
            </h1>
            <span className="text-[10px] text-slate-400">
              Total platform authority: Financials, Users, Algorithms & Transactions
            </span>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1.5"
          title="Refresh All Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="text-[10px] font-bold">Sync</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl text-center font-bold flex items-center justify-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Staff Desks Quick Switcher */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Link
          href="/admin/deposits"
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 flex items-center justify-between text-slate-300 transition"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deposit Desk</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Cashier Desk</span>
        </Link>
        <Link
          href="/admin/withdrawals"
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 flex items-center justify-between text-slate-300 transition"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-400" />
            <span>Payout Desk</span>
          </div>
          <span className="text-[10px] text-rose-400 font-mono">Payout Desk</span>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Today's Profit */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" /> Today's Net Profit
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                Live
              </span>
            </div>
            <div
              className={`text-2xl font-black mt-1 font-mono ${
                stats.todayNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {stats.todayNetProfit >= 0 ? "+" : ""}₹{stats.todayNetProfit.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-400 mt-1 flex justify-between font-mono">
              <span>In: ₹{stats.todayRechargeAmount.toFixed(0)} ({stats.todayRechargeCount})</span>
              <span>Out: ₹{stats.todayWithdrawalAmount.toFixed(0)} ({stats.todayWithdrawalCount})</span>
            </div>
          </div>

          {/* Card 2: Safe Withdrawable Profit */}
          <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-amber-300 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Safe Owner Profit
              </span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                Withdrawable
              </span>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
              ₹{stats.safeWithdrawableProfit.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-400 mt-1 leading-tight">
              Safe to withdraw to your personal bank without touching user deposits.
            </div>
          </div>

          {/* Card 3: Total Players & Active Liability */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Total Players
              </span>
              <span className="font-mono text-white text-xs font-black">{stats.totalUsers}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase block font-semibold">
                User Balance in Wallets
              </span>
              <span className="text-base font-black text-amber-400 font-mono">
                ₹{stats.totalUserBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Card 4: Pending Queues */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
              <span className="flex items-center gap-1">
                <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-400" /> Pending Payouts
              </span>
              <span className="font-mono text-rose-400 text-xs font-black">
                {stats.pendingWithdrawalsCount}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-end">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-semibold">
                  Pending Amount
                </span>
                <span className="text-base font-black text-rose-400 font-mono">
                  ₹{stats.pendingWithdrawalsAmount.toFixed(2)}
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono">
                {stats.pendingDepositsCount} Deps
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs (6 Tabs) */}
      <div className="grid grid-cols-6 border-b border-slate-800 text-[10px] font-bold text-center">
        <button
          onClick={() => setActiveTab("FINANCIALS")}
          className={`pb-2 transition ${
            activeTab === "FINANCIALS"
              ? "text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Ledger
        </button>

        <button
          onClick={() => setActiveTab("USERS")}
          className={`pb-2 transition ${
            activeTab === "USERS"
              ? "text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Users ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab("DEPOSITS")}
          className={`pb-2 transition relative ${
            activeTab === "DEPOSITS"
              ? "text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Deposits
          {deposits.length > 0 && (
            <span className="ml-1 px-1 bg-emerald-500 text-black text-[8px] font-black rounded-full">
              {deposits.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("WITHDRAWALS")}
          className={`pb-2 transition relative ${
            activeTab === "WITHDRAWALS"
              ? "text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Payouts
          {withdrawals.length > 0 && (
            <span className="ml-1 px-1 bg-rose-500 text-white text-[8px] font-black rounded-full">
              {withdrawals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ALGORITHM")}
          className={`pb-2 transition ${
            activeTab === "ALGORITHM"
              ? "text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Algorithms
        </button>

        <button
          onClick={() => setActiveTab("DATA_BACKUP")}
          className={`pb-2 transition flex items-center justify-center gap-1 ${
            activeTab === "DATA_BACKUP"
              ? "text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Database className="w-3 h-3 text-cyan-400" />
          <span>6M Backups</span>
        </button>
      </div>

      {/* TAB 1: FINANCIALS & PROFIT RECONCILIATION */}
      {activeTab === "FINANCIALS" && stats && (
        <div className="flex flex-col gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Building className="w-4 h-4 text-amber-400" />
              <span>Single Bank Account Reconciliation Formula</span>
            </h3>

            <div className="text-[11px] text-slate-300 leading-relaxed space-y-2">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs">
                <div className="text-slate-400 text-[10px] mb-1 font-sans">
                  Total Real Money Collected vs Paid Out (All-Time)
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Total Deposits Received:</span>
                  <span>+₹{stats.allTimeDeposits.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-400 mt-1">
                  <span>Total Withdrawals Paid Out:</span>
                  <span>-₹{stats.allTimeWithdrawals.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-800 my-1.5 pt-1.5 flex justify-between font-bold text-white">
                  <span>Net House Cash Margin:</span>
                  <span>₹{stats.allTimeNetRevenue.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 font-mono text-xs">
                <div className="text-amber-400 text-[10px] mb-1 font-sans font-bold">
                  Liability Deductions (Money that belongs to users)
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Active User Balances (Escrow):</span>
                  <span>-₹{stats.totalUserBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300 mt-1">
                  <span>Pending Withdrawals in Queue:</span>
                  <span>-₹{stats.pendingWithdrawalsAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-amber-500/30 my-1.5 pt-1.5 flex justify-between font-black text-amber-400 text-sm">
                  <span>Safe Withdrawable Company Profit:</span>
                  <span>₹{stats.safeWithdrawableProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start gap-2 text-[10px] text-slate-400">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Deficit Guarantee:</strong> You can safely transfer up to{" "}
                <strong className="text-amber-400 font-mono">
                  ₹{stats.safeWithdrawableProfit.toFixed(2)}
                </strong>{" "}
                from your company bank account to your personal account today. Even if all active players
                request withdrawal tomorrow, your bank account will have 100% sufficient funds.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT & PUNISHMENT */}
      {activeTab === "USERS" && (
        <div className="flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search user by phone number or referral code..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          <div className="text-[10px] text-slate-400 font-semibold flex justify-between items-center px-1">
            <span>Showing {filteredUsers.length} of {usersList.length} registered players</span>
            <span className="text-amber-400">1-Click Freeze & Balance Controls Active</span>
          </div>

          {/* User Cards */}
          <div className="flex flex-col gap-2.5">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`bg-slate-900 border rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-lg transition ${
                  u.isFrozen
                    ? "border-rose-500/60 bg-rose-950/10"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm font-mono">{u.phone}</span>
                      {u.isFrozen ? (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" /> Frozen
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      Ref: {u.referralCode} | Bets: {(u._count?.winGoBets || 0) + (u._count?.aviatorBets || 0)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase block font-semibold">
                      Balance
                    </span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      ₹{u.wallet?.balance ? u.wallet.balance.toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>

                {u.isFrozen && u.freezeReason && (
                  <div className="text-[10px] bg-rose-900/30 text-rose-300 p-2 rounded-lg border border-rose-800/40 font-mono">
                    <strong>Freeze Reason:</strong> {u.freezeReason}
                  </div>
                )}

                {/* Individual User Control Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      setFreezeModalUser(u);
                      setFreezeReason(u.freezeReason || "");
                    }}
                    className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                      u.isFrozen
                        ? "bg-emerald-600 hover:bg-emerald-500 text-black"
                        : "bg-rose-900/40 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300"
                    }`}
                  >
                    {u.isFrozen ? (
                      <>
                        <Unlock className="w-3 h-3" /> Unfreeze
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" /> Freeze User
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedUserForBalance(u)}
                    className="py-1.5 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
                  >
                    <Sliders className="w-3 h-3 text-amber-400" />
                    <span>Adjust ₹</span>
                  </button>

                  <button
                    onClick={() => setInspectUserId(u.id)}
                    className="py-1.5 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3 text-blue-400" />
                    <span>Full Audit</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                No users found matching query "{userSearchQuery}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PENDING DEPOSITS (RECHARGE APPROVAL / REJECTION) */}
      {activeTab === "DEPOSITS" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs px-1">
            <span className="font-extrabold text-white">Pending Recharge Queue</span>
            <span className="text-[10px] text-amber-400 font-mono">
              {deposits.length} pending requests
            </span>
          </div>

          {deposits.map((dep) => (
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

              <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl font-mono border border-slate-800/80">
                <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">
                  12-Digit Transaction Ref / UTR:
                </div>
                <div className="font-bold text-amber-400 text-xs">
                  {dep.utrNumber || "NOT PROVIDED"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setRejectingTx({ id: dep.id, type: "DEPOSIT" })}
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

          {deposits.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              No pending recharge requests. All cleared!
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PENDING WITHDRAWALS (PAYOUT PROCESSING / REJECTION) */}
      {activeTab === "WITHDRAWALS" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs px-1">
            <span className="font-extrabold text-white">Pending Withdrawal Queue</span>
            <span className="text-[10px] text-rose-400 font-mono">
              {withdrawals.length} requests (₹{stats?.pendingWithdrawalsAmount.toFixed(2)})
            </span>
          </div>

          {withdrawals.map((w) => {
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

                <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Holder:</span>
                    <span className="font-bold text-white">{bank?.accountHolderName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank Name:</span>
                    <span>{bank?.bankName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Number:</span>
                    <span className="text-amber-400 font-bold">{bank?.accountNumber || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IFSC Code:</span>
                    <span>{bank?.ifscCode || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">UPI ID:</span>
                    <span className="text-emerald-400 font-bold">{bank?.upiId || "N/A"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setRejectingTx({ id: w.id, type: "WITHDRAWAL" })}
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
                    <span>Approve & Mark Transferred</span>
                  </button>
                </div>
              </div>
            );
          })}

          {withdrawals.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              No pending payouts. All player withdrawals cleared!
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ALGORITHM & PROFIT CONTROLLER */}
      {activeTab === "ALGORITHM" && (
        <form onSubmit={handleSaveAlgorithm} className="flex flex-col gap-4">
          {/* WinGo Profit Engine */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-extrabold text-sm text-white">WinGo Profit Optimization Engine</h3>
              </div>
              <span className="text-[10px] text-amber-400 font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                House Margin Guard
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Outcome Selection Strategy
              </label>
              <select
                value={wingoMode}
                onChange={(e) => setWingoMode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
              >
                <option value="BALANCED_PROFIT">
                  ⚖️ Balanced Win-Win (House Guaranteed Profit + Rewards Active Winners)
                </option>
                <option value="MAX_PROFIT">
                  💰 Maximum Profit (Selects lowest payout number every single round)
                </option>
                <option value="PURE_RANDOM">
                  🎲 Pure Random RNG (Uncontrolled mathematical variance)
                </option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                *Balanced Win-Win evaluates all 10 candidate numbers (0-9) live before draw. It filters only outcomes where house retains margin, then randomly picks one to keep patterns natural and believable.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-300 mb-1">
                <span>Target House Profit Retention</span>
                <span className="font-mono text-amber-400 font-black">{wingoMargin}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={wingoMargin}
                onChange={(e) => setWingoMargin(parseInt(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>10% (Player Friendly)</span>
                <span>25% (Standard Daman)</span>
                <span>50% (High Retention)</span>
              </div>
            </div>
          </div>

          {/* Aviator Crash Risk Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="font-extrabold text-sm text-white">Aviator Crash Risk Engine</h3>
              </div>
              <span className="text-[10px] text-rose-400 font-bold uppercase bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                Exposure Cap
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Crash Multiplier Strategy
              </label>
              <select
                value={aviatorMode}
                onChange={(e) => setAviatorMode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
              >
                <option value="BALANCED_PROFIT">
                  ✈️ Dynamic Adaptive (Crashes on heavy stakes, Moonshots on small stakes)
                </option>
                <option value="CONSERVATIVE">
                  🛡️ Conservative (Strict multiplier ceiling / Protects platform reserves)
                </option>
                <option value="PROVABLY_FAIR">
                  🎲 Statistical SHA-256 (Pure Math / Standard ~96% RTP)
                </option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Max Allowable Platform Liability Per Round (₹)
              </label>
              <input
                type="number"
                step="1000"
                min="1000"
                value={aviatorCap}
                onChange={(e) => setAviatorCap(parseInt(e.target.value) || 1000)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Plane dynamically terminates flight before total cashout liability exceeds this limit.
              </span>
            </div>
          </div>

          {/* Payout Operations Mode Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-extrabold text-sm text-white">Payout Operations Routing</h3>
              </div>
              <span className="text-[10px] text-amber-400 font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                100% Manual Desk
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex justify-between items-center text-slate-300 font-semibold mb-1">
                <span>Instant Auto-Transfer:</span>
                <span className="font-mono text-rose-400 font-bold uppercase">Deactivated (Manual Mode)</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                *100% of player withdrawals are currently routed to the <strong>Withdrawal Payout Desk (`/operator/payouts`)</strong> and Admin Dashboard. Staff transfers funds manually via Google Pay / PhonePe from your SBI account, then clicks <strong>"Mark Transferred"</strong>.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingAlgo}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-black text-sm shadow-xl shadow-amber-500/20 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>{savingAlgo ? "Updating..." : "Save Algorithm & Payout Settings"}</span>
          </button>
        </form>
      )}

      {/* TAB 6: DATA RETENTION, 6-MONTH AUDIT EXPORT & DATABASE BACKUPS */}
      {activeTab === "DATA_BACKUP" && (
        <div className="flex flex-col gap-4">
          {/* Main Vault Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Database className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    6-Month Historical Data Vault & Backups
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Rolling 180-day preservation of all user credentials, bets, and transaction ledgers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerBackup}
                disabled={backupLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-4 py-2 rounded-xl font-black text-xs shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <HardDrive className={`w-3.5 h-3.5 ${backupLoading ? "animate-spin" : ""}`} />
                <span>{backupLoading ? "Creating Backup..." : "Create Backup Snapshot"}</span>
              </button>
            </div>

            {/* Storage Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">
                  Retention Window
                </span>
                <span className="text-base font-black text-cyan-400 font-mono">
                  {retentionStats?.retentionWindowDays || 180} Days
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Rolling Audit Window</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">
                  Database Size
                </span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {retentionStats?.databaseSizeFormatted || "816 KB"}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">SQLite High Performance</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">
                  Oldest Stored Record
                </span>
                <span className="text-xs font-bold text-amber-300 font-mono block mt-1">
                  {retentionStats?.oldestRecordDate
                    ? new Date(retentionStats.oldestRecordDate).toLocaleDateString("en-IN")
                    : "Active Today"}
                </span>
                <span className="text-[9px] text-slate-400 block">
                  {retentionStats?.totalDaysRetained || 1} day(s) retained
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">
                  Saved Snapshots
                </span>
                <span className="text-base font-black text-white font-mono">
                  {retentionStats?.totalBackups || 0} Backups
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">in backend/backups/</span>
              </div>
            </div>

            {retentionStats?.latestBackup && (
              <div className="text-[11px] bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-slate-300 font-mono">
                <span className="text-slate-400 font-sans text-[10px]">Latest Snapshot:</span>
                <span className="text-cyan-300 font-bold truncate ml-2">
                  {retentionStats.latestBackup}
                </span>
              </div>
            )}
          </div>

          {/* Records Preserved Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Historical Records Preserved in Vault</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">
                    Player Recharges / Deposits
                  </span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    {retentionStats?.totalRecharges || 0} deposits
                  </span>
                </div>
                <span className="text-slate-400 font-mono font-bold">
                  ₹{(retentionStats?.totalRechargeAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">
                    Player Withdrawals / Payouts
                  </span>
                  <span className="text-rose-400 font-mono font-bold text-sm">
                    {retentionStats?.totalWithdrawals || 0} payouts
                  </span>
                </div>
                <span className="text-slate-400 font-mono font-bold">
                  ₹{(retentionStats?.totalWithdrawalAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">
                    Win Go Color Prediction Game
                  </span>
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    {retentionStats?.totalWinGoBets || 0} player bets
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  across {retentionStats?.totalWinGoRounds || 0} rounds
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">
                    Aviator Crash Game
                  </span>
                  <span className="text-rose-400 font-mono font-bold text-sm">
                    {retentionStats?.totalAviatorBets || 0} crash bets
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  across {retentionStats?.totalAviatorRounds || 0} flights
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 col-span-1 sm:col-span-2 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">
                    Player Account Credentials & KYC Dossier
                  </span>
                  <span className="text-cyan-400 font-mono font-bold text-sm">
                    {retentionStats?.totalPlayers || 0} Registered Players
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Encrypted & Indexed
                </span>
              </div>
            </div>
          </div>

          {/* 1-Click CSV Audit Reports Download Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Download 6-Month Audit Reports (CSV)</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Export high-resolution audit spreadsheets compatible with Microsoft Excel, Google Sheets, or tax accounting tools.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Export Recharges */}
              <button
                type="button"
                onClick={() => handleDownloadCsv("RECHARGES", "superstar_recharges_6months.csv")}
                disabled={exportLoading !== null}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-emerald-400 block">
                    📥 6-Month Recharges (CSV)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    UTR, Phone, Amount, Method, Date
                  </span>
                </div>
                <Download className={`w-4 h-4 text-slate-400 group-hover:text-emerald-400 ${exportLoading === "RECHARGES" ? "animate-bounce" : ""}`} />
              </button>

              {/* Export Withdrawals */}
              <button
                type="button"
                onClick={() => handleDownloadCsv("WITHDRAWALS", "superstar_withdrawals_6months.csv")}
                disabled={exportLoading !== null}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/40 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-rose-400 block">
                    📤 6-Month Withdrawals (CSV)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Bank, IFSC, UPI, Phone, Status
                  </span>
                </div>
                <Download className={`w-4 h-4 text-slate-400 group-hover:text-rose-400 ${exportLoading === "WITHDRAWALS" ? "animate-bounce" : ""}`} />
              </button>

              {/* Export WinGo Bets */}
              <button
                type="button"
                onClick={() => handleDownloadCsv("WINGO_BETS", "superstar_wingo_bets_6months.csv")}
                disabled={exportLoading !== null}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-amber-400 block">
                    🎯 6-Month Win Go Bets (CSV)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Period, Color, Win/Loss, P&L
                  </span>
                </div>
                <Download className={`w-4 h-4 text-slate-400 group-hover:text-amber-400 ${exportLoading === "WINGO_BETS" ? "animate-bounce" : ""}`} />
              </button>

              {/* Export Aviator Bets */}
              <button
                type="button"
                onClick={() => handleDownloadCsv("AVIATOR_BETS", "superstar_aviator_bets_6months.csv")}
                disabled={exportLoading !== null}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-cyan-400 block">
                    ✈️ 6-Month Aviator Bets (CSV)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Crash Multiplier, Cashout, Win ₹
                  </span>
                </div>
                <Download className={`w-4 h-4 text-slate-400 group-hover:text-cyan-400 ${exportLoading === "AVIATOR_BETS" ? "animate-bounce" : ""}`} />
              </button>

              {/* Export Players Dossier */}
              <button
                type="button"
                onClick={() => handleDownloadCsv("PLAYERS", "superstar_players_dossier.csv")}
                disabled={exportLoading !== null}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-left transition flex items-center justify-between group col-span-1 sm:col-span-2 disabled:opacity-50"
              >
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-blue-400 block">
                    👥 Export All Registered Players Dossier (CSV)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Phone, Balance, Role, Referral Code, Bank Accounts, KYC, Registration Date
                  </span>
                </div>
                <Download className={`w-4 h-4 text-slate-400 group-hover:text-blue-400 ${exportLoading === "PLAYERS" ? "animate-bounce" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: FREEZE / UNFREEZE USER (PUNISHMENT CONTROL) */}
      {freezeModalUser && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm border-b border-slate-800 pb-2">
              <Ban className="w-4 h-4" />
              <span>
                {freezeModalUser.isFrozen ? "Unfreeze Player Account" : "Freeze & Punish Player Account"}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              User Phone: <strong className="text-white font-mono">{freezeModalUser.phone}</strong>
            </p>

            {!freezeModalUser.isFrozen && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Reason for Freeze / Punishment
                </label>
                <textarea
                  rows={3}
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="e.g. Unusual betting patterns, suspicious UTR submit, multiple accounts detected..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-400 font-mono"
                />
                <span className="text-[9px] text-slate-400 mt-1 block">
                  *When frozen, the user will be instantly logged out and blocked from placing bets, depositing, or withdrawing.
                </span>
              </div>
            )}

            {freezeModalUser.isFrozen && (
              <p className="text-xs text-emerald-400 font-medium bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                Are you sure you want to lift the suspension for this player? They will regain full access to deposit, bet, and withdraw.
              </p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setFreezeModalUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleFreeze}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black ${
                  freezeModalUser.isFrozen
                    ? "bg-emerald-500 text-black"
                    : "bg-rose-600 text-white shadow-lg shadow-rose-950/40"
                }`}
              >
                {freezeModalUser.isFrozen ? "Confirm Unfreeze" : "Confirm Freeze"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST BALANCE MODAL */}
      {selectedUserForBalance && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-2">
              Manual Balance Adjustment: {selectedUserForBalance.phone}
            </h3>
            <p className="text-xs text-slate-400">
              Current Balance: ₹{selectedUserForBalance.wallet?.balance?.toFixed(2) || "0.00"}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType("ADD")}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  adjustType === "ADD"
                    ? "bg-emerald-600 text-black shadow"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                + Add Funds
              </button>
              <button
                type="button"
                onClick={() => setAdjustType("DEDUCT")}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  adjustType === "DEDUCT"
                    ? "bg-rose-600 text-white shadow"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                - Deduct Funds
              </button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                Admin Audit Note
              </label>
              <input
                type="text"
                placeholder="Reason for adjustment..."
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSelectedUserForBalance(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustBalance}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECTION REASON MODAL (DEPOSIT OR WITHDRAWAL) */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="font-extrabold text-sm text-rose-400 border-b border-slate-800 pb-2">
              Reject {rejectingTx.type === "DEPOSIT" ? "Recharge" : "Withdrawal"} Request
            </h3>

            <p className="text-xs text-slate-300">
              {rejectingTx.type === "DEPOSIT"
                ? "This will decline the recharge and not credit any funds."
                : "This will decline the withdrawal and instantly refund the locked amount back to user's wallet."}
            </p>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                Rejection Reason (Visible to user)
              </label>
              <input
                type="text"
                placeholder={
                  rejectingTx.type === "DEPOSIT"
                    ? "e.g. Invalid UTR, payment not received in bank"
                    : "e.g. Wagering requirement not met, wrong bank IFSC"
                }
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setRejectingTx(null);
                  setRejectionReason("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={
                  rejectingTx.type === "DEPOSIT"
                    ? handleConfirmRejectDeposit
                    : handleConfirmRejectWithdrawal
                }
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950/40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL USER INSPECTION MODAL */}
      {inspectUserId && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Player Dossier & Audit</span>
              </h3>
              <button
                onClick={() => setInspectUserId(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {loadingInspection && (
              <div className="p-8 text-center text-xs text-slate-400">Loading audit trail...</div>
            )}

            {inspectedUser && (
              <div className="flex flex-col gap-3 text-xs">
                {/* User Summary Card */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center font-mono">
                  <div>
                    <span className="text-white font-black text-sm block">{inspectedUser.phone}</span>
                    <span className="text-[10px] text-slate-400">
                      ID: {inspectedUser.id.substring(0, 10)}... | Ref: {inspectedUser.referralCode}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-black text-base">
                      ₹{inspectedUser.wallet?.balance?.toFixed(2) || "0.00"}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Current Assets</span>
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Registered Bank Accounts
                  </h4>
                  {inspectedUser.bankAccounts && inspectedUser.bankAccounts.length > 0 ? (
                    inspectedUser.bankAccounts.map((b, i) => (
                      <div
                        key={i}
                        className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px]"
                      >
                        <div>Holder: {b.accountHolderName}</div>
                        <div>Bank: {b.bankName || "N/A"} | Acc: {b.accountNumber || "N/A"}</div>
                        <div>IFSC: {b.ifscCode || "N/A"} | UPI: {b.upiId || "N/A"}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-slate-500 italic">No bank accounts linked yet.</div>
                  )}
                </div>

                {/* Recent WinGo Bets */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Recent WinGo Bets ({inspectedUser.winGoBets.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-[10px]">
                    {inspectedUser.winGoBets.map((b) => (
                      <div key={b.id} className="flex justify-between border-b border-slate-800/60 pb-0.5">
                        <span className="text-slate-300">
                          {b.round?.period?.slice(-4) || "P"}: {b.selectValue} (₹{b.betAmount})
                        </span>
                        <span className={b.status === "WON" ? "text-emerald-400 font-bold" : "text-rose-400"}>
                          {b.status === "WON" ? `+₹${b.winAmount}` : "LOST"}
                        </span>
                      </div>
                    ))}
                    {inspectedUser.winGoBets.length === 0 && (
                      <div className="text-slate-500 italic">No WinGo bets found.</div>
                    )}
                  </div>
                </div>

                {/* Recent Aviator Bets */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Recent Aviator Bets ({inspectedUser.aviatorBets.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-[10px]">
                    {inspectedUser.aviatorBets.map((b) => (
                      <div key={b.id} className="flex justify-between border-b border-slate-800/60 pb-0.5">
                        <span className="text-slate-300">
                          R#{b.round?.roundNumber?.slice(-4) || "R"}: ₹{b.betAmount} (Crashed {b.round?.crashPoint}x)
                        </span>
                        <span className={b.status === "CASHED_OUT" ? "text-emerald-400 font-bold" : "text-rose-400"}>
                          {b.status === "CASHED_OUT" ? `+₹${b.winAmount} (${b.cashoutMultiplier}x)` : "CRASHED"}
                        </span>
                      </div>
                    ))}
                    {inspectedUser.aviatorBets.length === 0 && (
                      <div className="text-slate-500 italic">No Aviator bets found.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
