"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { apiRequest } from "../../../lib/api";
import confetti from "canvas-confetti";
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  Headphones,
  RotateCw,
  Wallet,
  Megaphone,
  BookOpen,
  History,
  TrendingUp,
  Flame,
  Check,
  X,
  HelpCircle,
  Zap,
  MessageCircle,
  Trophy,
} from "lucide-react";

interface RoundResult {
  id: string;
  period: string;
  winningNumber: number;
  winningColor: string;
  winningSize: string;
  createdAt: string;
}

interface UserBet {
  id: string;
  round: { period: string };
  selectType: string;
  selectValue: string;
  betAmount: number;
  winAmount: number;
  status: "PENDING" | "WON" | "LOST";
  createdAt: string;
}

interface WinningDetails {
  period: string;
  winningNumber: number;
  winningColor: string;
  winningSize: string;
  winAmount: number;
  contractAmount: number;
  multiplier: number;
  selectValue: string;
}

export default function WinGoPage() {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();

  // Round states
  const [period, setPeriod] = useState<string>("20261106100051558");
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isBettingOpen, setIsBettingOpen] = useState<boolean>(true);
  const [selectedGameMode, setSelectedGameMode] = useState<"30S" | "1M" | "3M" | "5M">("30S");

  // Audio / Sound toggle
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Tab State: "GAME_HISTORY" | "CHART" | "FOLLOW_STRATEGY" | "MY_HISTORY"
  const [activeTab, setActiveTab] = useState<"GAME_HISTORY" | "CHART" | "FOLLOW_STRATEGY" | "MY_HISTORY">("GAME_HISTORY");

  // Data lists
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [myBets, setMyBets] = useState<UserBet[]>([]);

  // Multiplier selection bar
  const [activeMultiplier, setActiveMultiplier] = useState<number>(1);

  // Bet Slip Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedBetType, setSelectedBetType] = useState<"COLOR" | "NUMBER" | "SIZE">("COLOR");
  const [selectedBetValue, setSelectedBetValue] = useState<string>("GREEN");
  const selectedBetValueRef = useRef(selectedBetValue);
  useEffect(() => {
    selectedBetValueRef.current = selectedBetValue;
  }, [selectedBetValue]);
  const [baseBalanceUnit, setBaseBalanceUnit] = useState<number>(10);
  const [betQuantity, setBetQuantity] = useState<number>(1);
  const [agreeRules, setAgreeRules] = useState<boolean>(true);
  const [isSubmittingBet, setIsSubmittingBet] = useState<boolean>(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [betToast, setBetToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const lastSocketTickTimeRef = useRef<number>(Date.now());

  // Refresh balance icon animation
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);

  // Exact Daman Win Rules Modal (Image 1 & 2)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);

  // Win Receipt Modal
  const [winningDetails, setWinningDetails] = useState<WinningDetails | null>(null);

  // Fetch initial state & history for selected mode (isInitialMount controls whether to load timer from HTTP)
  const fetchData = async (modeKey?: "30S" | "1M" | "3M" | "5M", isInitialMount: boolean = false) => {
    const currentMode = modeKey || selectedGameMode;
    try {
      // ONLY set timer and period on initial mode load, NEVER in background refreshes!
      if (isInitialMount) {
        const state = await apiRequest(`/games/wingo/state?type=${currentMode}`);
        setPeriod(state.period);
        setTimeLeft(state.timeLeft);
        setIsBettingOpen(state.isBettingOpen);
      }

      const hist = await apiRequest(`/games/wingo/history?type=${currentMode}`);
      setHistory(hist);

      if (user) {
        const userBets = await apiRequest(`/games/wingo/my-bets?type=${currentMode}`);
        setMyBets(userBets);
      }
    } catch (e) {
      console.error("Error fetching Win Go data", e);
    }
  };

  useEffect(() => {
    fetchData(selectedGameMode, true);
  }, [selectedGameMode]);

  // Socket listener for real-time round synchronization
  useEffect(() => {
    if (!socket) return;

    const isTargetMode = (data: any) => {
      if (!data) return false;
      if (data.shortType === selectedGameMode) return true;
      const modeMap: Record<string, string> = {
        "30SEC": "30S",
        "1MIN": "1M",
        "3MIN": "3M",
        "5MIN": "5M",
      };
      return modeMap[data.gameType] === selectedGameMode;
    };

    socket.on("wingo_new_round", (data) => {
      if (!isTargetMode(data)) return;
      lastSocketTickTimeRef.current = Date.now();
      setPeriod(data.period);
      setTimeLeft(data.timeLeft);
      setIsBettingOpen(true);
    });

    socket.on("wingo_tick", (data) => {
      if (!isTargetMode(data)) return;
      lastSocketTickTimeRef.current = Date.now();
      setPeriod(data.period);
      setTimeLeft(data.timeLeft);
      setIsBettingOpen(data.isBettingOpen);
    });

    socket.on("wingo_betting_locked", (data) => {
      if (!isTargetMode(data)) return;
      lastSocketTickTimeRef.current = Date.now();
      setIsBettingOpen(false);
      setTimeLeft(data.timeLeft);
    });

    socket.on("wingo_round_result", async (data) => {
      if (!isTargetMode(data)) return;

      // Instant optimistic history update so draw result shows without network lag
      setHistory((prev) => {
        if (prev.some((h) => h.period === data.period)) return prev;
        return [
          {
            id: data.period,
            period: data.period,
            winningNumber: data.winningNumber,
            winningColor: data.winningColor,
            winningSize: data.winningSize,
            createdAt: new Date().toISOString(),
          },
          ...prev.slice(0, 49),
        ];
      });

      // Background sync after short delay
      setTimeout(() => {
        fetchData(selectedGameMode);
        refreshUser();
      }, 500);

      if (user && data.resolvedBets) {
        const myWin = data.resolvedBets.find(
          (b: any) => b.userId === user.id && b.status === "WON"
        );
        if (myWin) {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          setWinningDetails({
            period: data.period,
            winningNumber: data.winningNumber,
            winningColor: data.winningColor,
            winningSize: data.winningSize,
            winAmount: myWin.winAmount,
            contractAmount: myWin.contractAmount,
            multiplier: myWin.multiplier,
            selectValue: myWin.selectValue || selectedBetValueRef.current,
          });
        }
      }
    });

    return () => {
      socket.off("wingo_new_round");
      socket.off("wingo_tick");
      socket.off("wingo_betting_locked");
      socket.off("wingo_round_result");
    };
  }, [socket, user, selectedGameMode]);

  // Smart non-competing fallback ticker: ONLY decrements if a socket tick is delayed >1500ms
  // It NEVER jumps to 30 on its own — eliminating all counter jump glitches!
  useEffect(() => {
    const fallbackTimer = setInterval(() => {
      const timeSinceLastTick = Date.now() - lastSocketTickTimeRef.current;
      if (timeSinceLastTick >= 1500 && timeSinceLastTick < 6000) {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(fallbackTimer);
  }, []);

  const handleManualRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    await refreshUser();
    setTimeout(() => setIsRefreshingBalance(false), 500);
  };

  const handleOpenBetSlip = (type: "COLOR" | "NUMBER" | "SIZE", value: string) => {
    if (!isBettingOpen || timeLeft <= 5) {
      return;
    }
    setSelectedBetType(type);
    setSelectedBetValue(value);
    setBetQuantity(activeMultiplier);
    setBetError(null);
    setIsModalOpen(true);
  };

  const handleRandomPick = () => {
    if (!isBettingOpen || timeLeft <= 5) return;
    const randNum = Math.floor(Math.random() * 10);
    handleOpenBetSlip("NUMBER", String(randNum));
  };

  const handleConfirmBet = async () => {
    if (!user) {
      alert("Please login first to trade.");
      return;
    }
    const totalAmount = baseBalanceUnit * betQuantity;
    const maxBonus = Number((totalAmount / 3).toFixed(2));
    const bonusToUse = Math.min(user.wallet?.bonusBalance || 0, maxBonus);
    const realNeeded = Number((totalAmount - bonusToUse).toFixed(2));

    if (user.wallet.balance < realNeeded) {
      if (user.wallet.balance <= 0 && (user.wallet.bonusBalance || 0) > 0) {
        setBetError(
          "Real Cash Required: You need Real Cash to use Bonus Wallet (₹1 bonus for every ₹2 real cash). Please recharge!"
        );
      } else {
        setBetError(
          `Insufficient Real Cash. You need at least ₹${realNeeded} Real Cash (with ₹${bonusToUse} bonus applied). Current Real Cash: ₹${user.wallet.balance.toFixed(2)}. Please recharge!`
        );
      }
      return;
    }
    if (!agreeRules) {
      setBetError("Please agree to the Pre-sale rules");
      return;
    }

    // 1. Instant optimistic close & zero-latency feedback (<16ms)
    setIsModalOpen(false);
    setIsSubmittingBet(false);
    setBetError(null);
    setBetToast({
      type: "success",
      message: `Trade Placed: ₹${totalAmount} on ${selectedBetValue}!`,
    });
    setTimeout(() => setBetToast(null), 3000);

    // 2. Optimistic wallet balance update
    if (user.wallet) {
      user.wallet.balance = Math.max(0, user.wallet.balance - realNeeded);
      if (bonusToUse > 0 && user.wallet.bonusBalance) {
        user.wallet.bonusBalance = Math.max(0, user.wallet.bonusBalance - bonusToUse);
      }
    }

    // 3. Background API execution without blocking the user
    try {
      await apiRequest("/games/wingo/bet", {
        method: "POST",
        body: JSON.stringify({
          selectType: selectedBetType,
          selectValue: selectedBetValue,
          betAmount: totalAmount,
          gameType: selectedGameMode,
        }),
      });

      // Concurrently sync user wallet and active history
      Promise.all([refreshUser(), fetchData(selectedGameMode)]).catch(() => {});
    } catch (err: any) {
      // Revert wallet on network or server rejection
      refreshUser();
      setBetToast({
        type: "error",
        message: err.message || "Failed to place trade on server",
      });
      setTimeout(() => setBetToast(null), 4000);
    }
  };

  // Calculations for current bet slip according to exact Daman rules:
  // If you spend X to trade, after deducting 2 service fee (2%), contract amount is (X * 0.98)
  const currentTotalSpend = baseBalanceUnit * betQuantity;
  const currentServiceFee = Number((currentTotalSpend * 0.02).toFixed(2));
  const currentContractAmount = Number((currentTotalSpend * 0.98).toFixed(2));

  // Payout calculation preview according to rules
  const getPayoutPreview = () => {
    if (selectedBetType === "COLOR") {
      if (selectedBetValue === "GREEN") {
        return `(98*2) ₹${(currentContractAmount * 2).toFixed(2)} (or ₹${(currentContractAmount * 1.5).toFixed(2)} if 5)`;
      } else if (selectedBetValue === "RED") {
        return `(98*2) ₹${(currentContractAmount * 2).toFixed(2)} (or ₹${(currentContractAmount * 1.5).toFixed(2)} if 0)`;
      } else if (selectedBetValue === "VIOLET") {
        return `(98*4.5) ₹${(currentContractAmount * 4.5).toFixed(2)}`;
      }
    } else if (selectedBetType === "NUMBER") {
      return `(98*9) ₹${(currentContractAmount * 9).toFixed(2)}`;
    } else if (selectedBetType === "SIZE") {
      return `(98*2) ₹${(currentContractAmount * 2).toFixed(2)}`;
    }
    return `₹${(currentContractAmount * 2).toFixed(2)}`;
  };

  // 5 recent balls from history
  const recentFive = history.slice(0, 5);

  // Formatted countdown digits (MM : SS)
  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;
  const m1 = String(Math.floor(minutes / 10));
  const m2 = String(minutes % 10);
  const s1 = String(Math.floor(seconds / 10));
  const s2 = String(seconds % 10);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 pb-20 relative select-none">
      {/* Real-Time Instant Feedback Toast */}
      {betToast && (
        <div className="fixed top-4 inset-x-4 z-[200] max-w-sm mx-auto flex items-center justify-center animate-in slide-in-from-top duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border text-xs font-black backdrop-blur-md ${
              betToast.type === "success"
                ? "bg-emerald-600/95 text-white border-emerald-400 shadow-emerald-950/50"
                : "bg-rose-600/95 text-white border-rose-400 shadow-rose-950/50"
            }`}
          >
            <span>{betToast.type === "success" ? "⚡" : "⚠️"}</span>
            <span>{betToast.message}</span>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER (Coral-Red Daman Header) */}
      <header className="bg-gradient-to-r from-[#ff6b57] via-[#fe5043] to-[#fd423b] text-white px-4 pt-3 pb-8 rounded-b-[2rem] shadow-md relative">
        <div className="flex items-center justify-between">
          <Link href="/" className="p-1 text-white hover:opacity-80">
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </Link>

          {/* Superstar Brand Logo */}
          <div className="flex items-center gap-1.5 font-black text-xl tracking-wider">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-[#fe5043] font-black text-sm shadow-sm">
              S
            </div>
            <span>Superstar</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 hover:opacity-80 transition"
              title="Sound toggle"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <a
              href="https://t.me/Raayanhere"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:opacity-80 transition"
              title="24/7 Customer Care (@Raayanhere)"
            >
              <Headphones className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* 2. FLOATING DUAL WALLET BALANCE CARD (White Card in Header) */}
        <div className="mt-4 bg-white rounded-2xl p-4 shadow-xl text-slate-800 border border-slate-100">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Real Cash (Withdrawable)
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                  ₹{user?.wallet?.balance ? user.wallet.balance.toFixed(2) : "0.00"}
                </span>
                <button
                  onClick={handleManualRefreshBalance}
                  className={`p-1 rounded-full text-slate-400 hover:text-slate-600 ${
                    isRefreshingBalance ? "animate-spin" : ""
                  }`}
                  title="Refresh balance"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">
                Bonus Wallet (1:2)
              </span>
              <span className="text-lg font-black font-mono text-amber-600 mt-0.5 block">
                ₹{user?.wallet?.bonusBalance ? user.wallet.bonusBalance.toFixed(2) : "0.00"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/wallet/withdraw"
              className="py-2.5 rounded-full bg-[#f2413b] hover:bg-[#e0312b] text-white text-xs font-bold text-center shadow-md shadow-red-200 active:scale-95 transition"
            >
              Withdraw
            </Link>
            <Link
              href="/wallet/recharge"
              className="py-2.5 rounded-full bg-[#18b660] hover:bg-[#139a50] text-white text-xs font-bold text-center shadow-md shadow-green-200 active:scale-95 transition"
            >
              Deposit
            </Link>
          </div>
        </div>
      </header>

      {/* 3. MARQUEE ANNOUNCEMENT BAR */}
      <div className="px-3 -mt-3 relative z-10">
        <div className="bg-white rounded-xl px-3 py-2 shadow-sm border border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <div className="w-6 h-6 rounded-md bg-[#ffeae8] text-[#f2413b] flex items-center justify-center shrink-0">
              <Megaphone className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11px] text-slate-600 truncate font-medium">
              Welcome to Superstar Club! Official Win Go 30s Color Prediction platform with 24x7 instant withdrawals...
            </div>
          </div>
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#fe5043] to-[#f2413b] text-white text-[10px] font-bold shrink-0 shadow-sm flex items-center gap-0.5"
          >
            <Flame className="w-3 h-3" /> Detail
          </button>
        </div>
      </div>

      {/* 4. GAME TYPE SELECTOR TABS (WinGo 30sec, 1Min, 3Min, 5Min) */}
      <div className="px-3 mt-3">
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 grid grid-cols-4 gap-1">
          {[
            { id: "30S", label: "WinGo", sub: "30sec" },
            { id: "1M", label: "WinGo", sub: "1 Min" },
            { id: "3M", label: "WinGo", sub: "3 Min" },
            { id: "5M", label: "WinGo", sub: "5 Min" },
          ].map((mode) => {
            const isActive = selectedGameMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedGameMode(mode.id as any)}
                className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center transition ${
                  isActive
                    ? "bg-[#f2413b] text-white shadow-md shadow-red-200"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full mb-1 flex items-center justify-center border ${
                    isActive
                      ? "border-white/40 bg-white/20 text-white"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  <span className="text-[9px] font-black">⏱</span>
                </div>
                <span className="text-[10px] font-bold leading-tight block">{mode.label}</span>
                <span className="text-[9px] opacity-90 leading-tight block">{mode.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. PERIOD & TIME REMAINING SPLIT CARD (Dashed coral box) */}
      <div className="px-3 mt-3">
        <div className="rounded-2xl bg-gradient-to-r from-[#ff6854] to-[#fe4a3d] p-3.5 text-white shadow-md relative overflow-hidden flex items-stretch">
          {/* Left: How to play + Period label + 5 recent balls */}
          <div className="flex-1 pr-3 flex flex-col justify-between">
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="self-start px-2 py-0.5 rounded-full border border-white/40 text-[10px] font-semibold flex items-center gap-1 bg-white/10 hover:bg-white/20 transition active:scale-95"
            >
              <BookOpen className="w-3 h-3" /> How to play
            </button>

            <div className="mt-2 text-xs font-black tracking-wide text-white flex items-center gap-1.5">
              <span>
                {selectedGameMode === "30S" && "WinGo 30sec"}
                {selectedGameMode === "1M" && "WinGo 1Min"}
                {selectedGameMode === "3M" && "WinGo 3Min"}
                {selectedGameMode === "5M" && "WinGo 5Min"}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[8px] bg-white/20 border border-white/30 text-yellow-300 font-mono">
                {selectedGameMode}
              </span>
            </div>

            {/* 5 mini lottery balls */}
            <div className="flex items-center gap-1.5 mt-2">
              {recentFive.map((r, i) => {
                const isGreen = [1, 3, 7, 9].includes(r.winningNumber);
                const isRed = [2, 4, 6, 8].includes(r.winningNumber);
                const isVioletRed = r.winningNumber === 0;
                const isVioletGreen = r.winningNumber === 5;

                let ballClass = "bg-[#18b660]";
                if (isRed) ballClass = "bg-[#fe4343]";
                else if (isVioletRed) ballClass = "bg-gradient-to-tr from-purple-500 to-rose-500";
                else if (isVioletGreen) ballClass = "bg-gradient-to-tr from-purple-500 to-emerald-500";

                return (
                  <div
                    key={r.id || i}
                    className={`w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-sm border border-white/60 ${ballClass}`}
                  >
                    {r.winningNumber}
                  </div>
                );
              })}
              {recentFive.length === 0 && (
                <div className="text-[10px] text-white/70">Starting...</div>
              )}
            </div>
          </div>

          {/* Vertical dashed divider */}
          <div className="w-[1px] border-r-2 border-dashed border-white/40 mx-1" />

          {/* Right: Time Remaining & Flip Clock */}
          <div className="flex-1 pl-3 text-right flex flex-col justify-between items-end">
            <span className="text-[11px] font-semibold text-white/90">Time remaining</span>

            {/* Flip clock digit blocks */}
            <div className="flex items-center gap-1 font-mono font-black text-xl text-slate-800 my-1">
              <div className="w-6 h-8 rounded-md bg-white flex items-center justify-center shadow-md">
                {m1}
              </div>
              <div className="w-6 h-8 rounded-md bg-white flex items-center justify-center shadow-md">
                {m2}
              </div>
              <span className="text-white font-bold text-base -mx-0.5">:</span>
              <div
                className={`w-6 h-8 rounded-md bg-white flex items-center justify-center shadow-md ${
                  timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-slate-900"
                }`}
              >
                {s1}
              </div>
              <div
                className={`w-6 h-8 rounded-md bg-white flex items-center justify-center shadow-md ${
                  timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-slate-900"
                }`}
              >
                {s2}
              </div>
            </div>

            <span className="text-[11px] font-mono font-bold tracking-tight text-white">
              {period}
            </span>
          </div>
        </div>
      </div>

      {/* 6. MAIN BETTING BOARD CONTAINER (With Giant Countdown Overlay when <= 5s) */}
      <div className="px-3 mt-3 relative">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex flex-col gap-3 relative overflow-hidden">
          {/* GIANT COUNTDOWN OVERLAY (Iconic Daman Feature - Image 2) */}
          {timeLeft <= 5 && timeLeft > 0 && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-20 h-28 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-slate-200">
                  <span className="font-mono text-7xl font-black text-[#fe4343]">
                    {s1}
                  </span>
                </div>
                <div className="w-20 h-28 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-slate-200">
                  <span className="font-mono text-7xl font-black text-[#fe4343]">
                    {s2}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* COLOR BUTTONS ROW: Green (2x), Violet (4.5x), Red (2x) */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleOpenBetSlip("COLOR", "GREEN")}
              className="py-3 rounded-xl bg-[#18b660] hover:bg-[#139a50] text-white font-bold text-sm shadow-md active:scale-95 transition"
            >
              Green
            </button>
            <button
              onClick={() => handleOpenBetSlip("COLOR", "VIOLET")}
              className="py-3 rounded-xl bg-[#b13fe6] hover:bg-[#9c27b0] text-white font-bold text-sm shadow-md active:scale-95 transition"
            >
              Violet
            </button>
            <button
              onClick={() => handleOpenBetSlip("COLOR", "RED")}
              className="py-3 rounded-xl bg-[#fe4343] hover:bg-[#e0312b] text-white font-bold text-sm shadow-md active:scale-95 transition"
            >
              Red
            </button>
          </div>

          {/* 3D BALL NUMBERS 0 TO 9 GRID */}
          <div className="bg-[#f8fafc] rounded-2xl p-3 border border-slate-100 flex flex-col gap-2.5">
            {/* Row 1: 0, 1, 2, 3, 4 */}
            <div className="grid grid-cols-5 gap-2 justify-items-center">
              {[0, 1, 2, 3, 4].map((num) => {
                let ringColor = "border-[#18b660] text-[#18b660]";
                if (num === 2 || num === 4) ringColor = "border-[#fe4343] text-[#fe4343]";
                else if (num === 0) ringColor = "border-purple-500 text-purple-600";

                return (
                  <button
                    key={num}
                    onClick={() => handleOpenBetSlip("NUMBER", String(num))}
                    className="relative w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-md hover:scale-105 active:scale-90 transition group"
                  >
                    <div
                      className={`w-full h-full rounded-full border-4 flex items-center justify-center font-black text-lg ${ringColor}`}
                    >
                      {num}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Row 2: 5, 6, 7, 8, 9 */}
            <div className="grid grid-cols-5 gap-2 justify-items-center">
              {[5, 6, 7, 8, 9].map((num) => {
                let ringColor = "border-[#18b660] text-[#18b660]";
                if (num === 6 || num === 8) ringColor = "border-[#fe4343] text-[#fe4343]";
                else if (num === 5) ringColor = "border-purple-500 text-purple-600";

                return (
                  <button
                    key={num}
                    onClick={() => handleOpenBetSlip("NUMBER", String(num))}
                    className="relative w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-md hover:scale-105 active:scale-90 transition group"
                  >
                    <div
                      className={`w-full h-full rounded-full border-4 flex items-center justify-center font-black text-lg ${ringColor}`}
                    >
                      {num}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MULTIPLIER BAR: Random | X1 | X5 | X10 | X20 | X50 | X100 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={handleRandomPick}
              className="px-3 py-1.5 rounded-full border border-[#f2413b] text-[#f2413b] text-xs font-bold shrink-0 hover:bg-red-50 active:scale-95 transition"
            >
              Random
            </button>

            {[1, 5, 10, 20, 50, 100].map((mul) => {
              const isSelected = activeMultiplier === mul;
              return (
                <button
                  key={mul}
                  onClick={() => setActiveMultiplier(mul)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                    isSelected
                      ? "bg-[#18b660] text-white shadow-sm"
                      : "bg-[#f1f5f9] text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  X{mul}
                </button>
              );
            })}
          </div>

          {/* BIG / SMALL BUTTONS */}
          <div className="grid grid-cols-2 rounded-full overflow-hidden shadow-sm">
            <button
              onClick={() => handleOpenBetSlip("SIZE", "BIG")}
              className="py-3 bg-[#feaa35] hover:bg-[#f39c27] text-white font-bold text-sm tracking-wide text-center active:scale-98 transition"
            >
              Big
            </button>
            <button
              onClick={() => handleOpenBetSlip("SIZE", "SMALL")}
              className="py-3 bg-[#598efb] hover:bg-[#487ee8] text-white font-bold text-sm tracking-wide text-center active:scale-98 transition"
            >
              Small
            </button>
          </div>
        </div>
      </div>

      {/* 7. FOUR TABS: Game history | Chart | Follow Strategy | My history */}
      <div className="px-3 mt-4">
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { id: "GAME_HISTORY", label: "Game history" },
            { id: "CHART", label: "Chart" },
            { id: "FOLLOW_STRATEGY", label: "Follow Strategy" },
            { id: "MY_HISTORY", label: "My history" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition ${
                  isActive
                    ? "bg-[#f2413b] text-white shadow-md shadow-red-200"
                    : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: GAME HISTORY TABLE */}
        {activeTab === "GAME_HISTORY" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-4 bg-[#f2413b] text-white text-xs font-bold py-2.5 px-3 text-center">
              <div>Period</div>
              <div>Number</div>
              <div>Big Small</div>
              <div>Color</div>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {history.map((row) => {
                const isGreen = [1, 3, 7, 9].includes(row.winningNumber);
                const isRed = [2, 4, 6, 8].includes(row.winningNumber);
                const isVioletRed = row.winningNumber === 0;
                const isVioletGreen = row.winningNumber === 5;

                let textColor = "text-[#18b660]";
                let dotColor = "bg-[#18b660]";
                if (isRed) {
                  textColor = "text-[#fe4343]";
                  dotColor = "bg-[#fe4343]";
                } else if (isVioletRed) {
                  textColor = "text-purple-600";
                  dotColor = "bg-gradient-to-r from-purple-500 to-rose-500";
                } else if (isVioletGreen) {
                  textColor = "text-purple-600";
                  dotColor = "bg-gradient-to-r from-purple-500 to-emerald-500";
                }

                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-4 items-center py-2.5 px-3 text-xs text-center hover:bg-slate-50 transition"
                  >
                    <div className="font-mono text-slate-500 text-[11px]">{row.period}</div>
                    <div className={`font-black text-base ${textColor}`}>{row.winningNumber}</div>
                    <div className="text-slate-600 font-medium">{row.winningSize}</div>
                    <div className="flex justify-center">
                      <span className={`w-3 h-3 rounded-full shadow-sm ${dotColor}`} />
                    </div>
                  </div>
                );
              })}

              {history.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  Waiting for round completion...
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CHART WITH CONNECTED POLYLINE TREND */}
        {activeTab === "CHART" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col gap-3">
            <div className="text-xs font-bold text-slate-700">
              Statistic (last 100 Periods)
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[10px] text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="py-1 text-left font-normal">Winning Numbers</th>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <th key={n} className="py-1 font-bold text-slate-600">
                        <span className="w-4 h-4 rounded-full border border-slate-300 inline-flex items-center justify-center">
                          {n}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="py-1 text-left">Missing</td>
                    {[7, 6, 21, 3, 14, 42, 5, 2, 0, 1].map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1 text-left">Avg missing</td>
                    {[8, 10, 5, 7, 10, 19, 10, 5, 5, 9].map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1 text-left">Frequency</td>
                    {[10, 8, 14, 11, 8, 4, 8, 14, 14, 9].map((v, i) => (
                      <td key={i} className="font-bold text-slate-800">{v}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1 text-left">Max consecutive</td>
                    {[2, 1, 2, 2, 1, 1, 1, 2, 2, 1].map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 pb-2 border-b border-slate-100">
                <span>Period</span>
                <span>Number (0 - 9 Trend)</span>
                <span>Big/Small</span>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {history.slice(0, 15).map((row, idx) => (
                  <div key={row.id || idx} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 text-[10px] w-24">
                      {row.period.slice(-8)}
                    </span>

                    <div className="flex items-center gap-1.5 flex-1 justify-center">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                        const isWinner = n === row.winningNumber;
                        const isRed = [2, 4, 6, 8, 0].includes(n);

                        return (
                          <div
                            key={n}
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              isWinner
                                ? isRed
                                  ? "bg-[#fe4343] text-white shadow-sm ring-2 ring-red-200"
                                  : "bg-[#18b660] text-white shadow-sm ring-2 ring-green-200"
                                : "text-slate-300"
                            }`}
                          >
                            {n}
                          </div>
                        );
                      })}
                    </div>

                    <div className="w-8 text-right">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          row.winningSize === "BIG"
                            ? "bg-[#feaa35]/20 text-[#feaa35]"
                            : "bg-[#598efb]/20 text-[#598efb]"
                        }`}
                      >
                        {row.winningSize === "BIG" ? "B" : "S"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FOLLOW STRATEGY */}
        {activeTab === "FOLLOW_STRATEGY" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1">
                Betting Strategy <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <button className="flex items-center gap-1 text-[#18b660] hover:underline">
                <History className="w-3.5 h-3.5" /> History
              </button>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-lg font-bold">
                    🦁
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight">BigSmall</h4>
                    <span className="text-[10px] text-rose-500 font-bold">👥 2487 followed</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>Micheal</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-600">
                    martingale
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Return on Investment</span>
                  <span className="font-black text-[#fe4343] text-sm">+97.55%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Profit</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">₹107,718,634.56</span>
                </div>
              </div>

              <button
                onClick={() => alert("Following strategy activated for automatic Martingale betting!")}
                className="w-full py-2.5 rounded-xl bg-[#fe5043] hover:bg-[#e0312b] text-white text-xs font-bold shadow-md shadow-red-200 active:scale-98 transition"
              >
                Follow Strategy
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: MY HISTORY */}
        {activeTab === "MY_HISTORY" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-4 bg-[#f2413b] text-white text-xs font-bold py-2.5 px-3 text-center">
              <div>Period</div>
              <div>Select</div>
              <div>Amount</div>
              <div>Outcome</div>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {myBets.map((bet) => (
                <div
                  key={bet.id}
                  className="grid grid-cols-4 items-center py-2.5 px-3 text-xs text-center hover:bg-slate-50 transition"
                >
                  <div className="font-mono text-slate-500 text-[11px]">
                    {bet.round.period.slice(-6)}
                  </div>
                  <div className="font-bold text-slate-800">{bet.selectValue}</div>
                  <div className="text-slate-600 font-medium">
                    <div>₹{bet.betAmount}</div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      (C: ₹{(bet.betAmount * 0.98).toFixed(1)})
                    </div>
                  </div>
                  <div>
                    {bet.status === "WON" ? (
                      <span className="text-[#18b660] font-black">+₹{bet.winAmount}</span>
                    ) : bet.status === "LOST" ? (
                      <span className="text-[#fe4343] font-semibold">Lost</span>
                    ) : (
                      <span className="text-amber-500 animate-pulse font-semibold">Pending</span>
                    )}
                  </div>
                </div>
              ))}

              {myBets.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-300">
                    📋
                  </div>
                  <span>No bet history yet. Place a trade to see records!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 8. FLOATING RIGHT-HAND WIDGETS */}
      <div className="fixed right-3 bottom-24 z-40 flex flex-col gap-2.5">
        <div className="relative group cursor-pointer">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 shadow-lg flex items-center justify-center text-black border-2 border-white hover:scale-105 transition">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
            0
          </span>
        </div>

        <Link href="/games/aviator" className="block cursor-pointer">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 shadow-lg flex items-center justify-center text-white border-2 border-white hover:scale-105 transition text-lg">
            🐉
          </div>
        </Link>

        <Link href="/account" className="block cursor-pointer">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-red-500 shadow-lg flex items-center justify-center text-white border-2 border-white hover:scale-105 transition">
            <MessageCircle className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* 9. AUTHENTIC DAMAN BET SLIP MODAL (With Exact Rules & Fee Breakdown) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900">
                  {selectedGameMode === "30S" && "WinGo 30sec"}
                  {selectedGameMode === "1M" && "WinGo 1Min"}
                  {selectedGameMode === "3M" && "WinGo 3Min"}
                  {selectedGameMode === "5M" && "WinGo 5Min"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-[#fe4343] font-bold text-xs">
                  Select {selectedBetValue}
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {betError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
                  <p>{betError}</p>
                  {betError.includes("Recharge") && (
                    <Link
                      href="/wallet/recharge"
                      className="mt-2.5 inline-block bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold py-1.5 px-4 rounded-xl text-xs shadow hover:from-emerald-500 hover:to-green-500"
                    >
                      Recharge Wallet (Min ₹100) &rarr;
                    </Link>
                  )}
                </div>
              )}

              {/* Balance Units: ₹1, ₹10, ₹100, ₹1000 */}
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-2">Balance</span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 10, 100, 1000].map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setBaseBalanceUnit(unit)}
                      className={`py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                        baseBalanceUnit === unit
                          ? "bg-[#fe5043] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      ₹{unit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Quantity</span>
                <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setBetQuantity(Math.max(1, betQuantity - 1))}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-slate-700 hover:bg-slate-50 active:scale-95"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-base text-slate-800 w-8 text-center">
                    {betQuantity}
                  </span>
                  <button
                    onClick={() => setBetQuantity(betQuantity + 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-slate-700 hover:bg-slate-50 active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Multiplier Pills: X1, X5, X10, X20, X50, X100 */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[1, 5, 10, 20, 50, 100].map((m) => (
                  <button
                    key={m}
                    onClick={() => setBetQuantity(m)}
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition active:scale-95 ${
                      betQuantity === m
                        ? "bg-[#fe5043] text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    X{m}
                  </button>
                ))}
              </div>

              {/* Official Rule 2% Service Fee and Contract Breakdown Box */}
              {(() => {
                const maxBonus = Number((currentTotalSpend / 3).toFixed(2));
                const bonusToApply = Math.min(user?.wallet?.bonusBalance || 0, maxBonus);
                const realToPay = Number((currentTotalSpend - bonusToApply).toFixed(2));

                return (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex flex-col gap-1.5 font-medium">
                    <div className="flex justify-between text-slate-500">
                      <span>Trade Amount:</span>
                      <span className="font-bold text-slate-800 font-mono">₹{currentTotalSpend}</span>
                    </div>
                    {bonusToApply > 0 && (
                      <div className="flex justify-between text-amber-600 font-semibold py-0.5 border-t border-dashed border-slate-200">
                        <span>🎁 Bonus Applied (1:2 ratio):</span>
                        <span className="font-mono font-bold">-₹{bonusToApply.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span>Real Cash Required:</span>
                      <span className="font-bold text-slate-900 font-mono">₹{realToPay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Service Fee (2%):</span>
                      <span className="text-rose-500 font-mono font-bold">-₹{currentServiceFee}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200">
                      <span className="font-bold">Contract Amount:</span>
                      <span className="font-black text-[#18b660] font-mono">₹{currentContractAmount}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span className="font-bold">Estimated Payout (Real Cash):</span>
                      <span className="font-black text-[#fe4343] font-mono">{getPayoutPreview()}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Terms Agreement Checkbox */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={agreeRules}
                  onChange={(e) => setAgreeRules(e.target.checked)}
                  className="w-4 h-4 rounded text-red-500 accent-[#fe5043]"
                />
                <span onClick={() => setIsRulesModalOpen(true)} className="hover:underline cursor-pointer">
                  I agree to the <strong className="text-rose-500">Pre-sale rules</strong>
                </span>
              </div>
            </div>

            {/* Sticky Bottom Confirmation Bar (Always in View, Above Any Screen Cutoff) */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 flex items-center justify-between gap-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] z-20">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Total Spend</span>
                <span className="text-xl font-black text-[#fe4343] font-mono">
                  ₹{currentTotalSpend}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBet}
                  onClick={handleConfirmBet}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6854] to-[#fe4a3d] hover:from-[#fe5043] hover:to-[#e0312b] text-white text-xs font-black shadow-lg shadow-red-200 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingBet ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Placing...</span>
                    </>
                  ) : (
                    <span>Confirm Bet</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. EXACT DAMAN WIN-GO RULES MODAL (Images 1 & 2 from User) */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col items-center max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Header Red Pill */}
            <div className="px-5 py-1.5 rounded-b-2xl bg-[#fe5043] text-white text-xs font-black tracking-widest uppercase -mt-5 mb-4 shadow-md">
              · wingo30s ·
            </div>

            {/* Exact Rule Body (from user's screenshots) */}
            <div className="text-xs text-slate-700 leading-relaxed overflow-y-auto pr-1 flex flex-col gap-3">
              <p className="font-medium text-slate-800">
                30seconds 1 issue, 25 seconds to order, 5 seconds waiting for the draw.. It opens all day. The total number of trade is 2880 issues.
              </p>

              <p className="font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                If you spend 100 to trade, after deducting 2 service fee, your contract amount is 98:
              </p>

              <div className="flex flex-col gap-2">
                <div>
                  <strong className="text-slate-900">1. Select green:</strong> if the result shows 1,3,7,9 you will get (98*2) 196; If the result shows 5, you will get (98*1.5) 147
                </div>

                <div>
                  <strong className="text-slate-900">2. Select red:</strong> if the result shows 2,4,6,8 you will get (98*2) 196; If the result shows 0, you will get (98*1.5) 147
                </div>

                <div>
                  <strong className="text-slate-900">3. Select violet:</strong> if the result shows 0 or 5, you will get (98*4.5) 441
                </div>

                <div>
                  <strong className="text-slate-900">4. Select number:</strong> if the result is the same as the number you selected, you will get (98*9) 882
                </div>

                <div>
                  <strong className="text-slate-900">5. Select big:</strong> if the result shows 5,6,7,8,9 you will get (98 * 2) 196
                </div>

                <div>
                  <strong className="text-slate-900">6. Select small:</strong> if the result shows 0,1,2,3,4 you will get (98 * 2) 196
                </div>
              </div>
            </div>

            {/* Bottom Coral Red Close Button */}
            <button
              onClick={() => setIsRulesModalOpen(false)}
              className="mt-5 w-full py-3 rounded-full bg-[#f2413b] hover:bg-[#e0312b] text-white text-sm font-bold shadow-lg shadow-red-200 active:scale-95 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 11. WINNING RECEIPT POPUP (Shows calculations following the exact rule!) */}
      {winningDetails && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-black flex items-center justify-center text-2xl font-black shadow-lg shadow-amber-200 mb-2">
              🏆
            </div>

            <h3 className="font-black text-lg text-slate-900">Congratulations!</h3>
            <span className="text-xs text-slate-500 mb-4">You won in Issue {winningDetails.period.slice(-6)}</span>

            <div className="w-full bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col gap-1.5 text-xs text-left mb-4 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Draw Result:</span>
                <span className="font-black text-slate-900">
                  {winningDetails.winningNumber} ({winningDetails.winningColor}, {winningDetails.winningSize})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Your Selection:</span>
                <span className="font-bold text-[#fe4343]">{winningDetails.selectValue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contract Amount:</span>
                <span className="font-bold text-slate-800 font-mono">₹{winningDetails.contractAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payout Multiplier:</span>
                <span className="font-bold text-[#18b660] font-mono">{winningDetails.multiplier}x</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Net Winnings:</span>
                <span className="font-black text-[#18b660] font-mono">+₹{winningDetails.winAmount}</span>
              </div>
            </div>

            <button
              onClick={() => setWinningDetails(null)}
              className="w-full py-3 rounded-full bg-[#f2413b] text-white text-xs font-bold shadow-lg shadow-red-200 active:scale-95 transition"
            >
              Collect Cash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
