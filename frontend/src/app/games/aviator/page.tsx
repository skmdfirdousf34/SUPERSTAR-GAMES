"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { apiRequest } from "../../../lib/api";
import confetti from "canvas-confetti";
import {
  ChevronLeft,
  History,
  TrendingUp,
  ShieldCheck,
  Users,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  Menu,
  Headphones,
} from "lucide-react";

interface AviatorRoundHistory {
  id: string;
  roundNumber: string;
  crashPoint: number;
}

interface AviatorBetRecord {
  id: string;
  round: { roundNumber: string };
  betAmount: number;
  cashoutMultiplier?: number;
  winAmount: number;
  status: "PENDING" | "CASHED_OUT" | "CRASHED";
}

interface LivePlayerBet {
  betId: string;
  phone: string;
  betAmount: number;
  multiplier?: number;
  winAmount?: number;
  cashedOut?: boolean;
}

export default function AviatorPage() {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();

  // Round states
  const [status, setStatus] = useState<"BETTING" | "FLYING" | "CRASHED">("BETTING");
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [countdown, setCountdown] = useState<number>(5);
  const [history, setHistory] = useState<AviatorRoundHistory[]>([]);
  const [myBets, setMyBets] = useState<AviatorBetRecord[]>([]);
  const [livePlayers, setLivePlayers] = useState<LivePlayerBet[]>([]);

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Tab: All Bets | Previous | Top
  const [sideTab, setSideTab] = useState<"ALL" | "MY">("ALL");

  // DUAL BET PANEL 1
  const [bet1Amount, setBet1Amount] = useState<number>(10);
  const [auto1Enabled, setAuto1Enabled] = useState<boolean>(false);
  const [auto1Multiplier, setAuto1Multiplier] = useState<string>("2.00");
  const [activeBet1Id, setActiveBet1Id] = useState<string | null>(null);
  const [hasCashedOut1, setHasCashedOut1] = useState<boolean>(false);
  const [win1Amount, setWin1Amount] = useState<number>(0);
  const [loading1, setLoading1] = useState<boolean>(false);

  // DUAL BET PANEL 2
  const [bet2Amount, setBet2Amount] = useState<number>(10);
  const [auto2Enabled, setAuto2Enabled] = useState<boolean>(false);
  const [auto2Multiplier, setAuto2Multiplier] = useState<string>("5.00");
  const [activeBet2Id, setActiveBet2Id] = useState<string | null>(null);
  const [hasCashedOut2, setHasCashedOut2] = useState<boolean>(false);
  const [win2Amount, setWin2Amount] = useState<number>(0);
  const [loading2, setLoading2] = useState<boolean>(false);

  // Canvas & High-Performance Animation Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const statusRef = useRef<"BETTING" | "FLYING" | "CRASHED">(status);
  const targetMultiplierRef = useRef<number>(currentMultiplier);
  const countdownRef = useRef<number>(countdown);
  const lastStateUpdateRef = useRef<number>(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  const fetchData = async () => {
    try {
      const state = await apiRequest("/games/aviator/state");
      setStatus(state.status);
      setCurrentMultiplier(state.currentMultiplier);
      setCountdown(state.bettingCountdown);

      const hist = await apiRequest("/games/aviator/history");
      setHistory(hist);

      if (user) {
        const bets = await apiRequest("/games/aviator/my-bets");
        setMyBets(bets);
      }
    } catch (e) {
      console.error("Error fetching Aviator data", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("aviator_betting_start", (data) => {
      statusRef.current = "BETTING";
      targetMultiplierRef.current = 1.0;
      countdownRef.current = data.countdown || 5;
      setStatus("BETTING");
      setCurrentMultiplier(1.0);
      setCountdown(data.countdown || 5);
      // Reset Bet 1
      setActiveBet1Id(null);
      setHasCashedOut1(false);
      setWin1Amount(0);
      // Reset Bet 2
      setActiveBet2Id(null);
      setHasCashedOut2(false);
      setWin2Amount(0);
      setLivePlayers([]);
    });

    socket.on("aviator_countdown_tick", (data) => {
      statusRef.current = "BETTING";
      countdownRef.current = data.countdown;
      setStatus("BETTING");
      setCountdown(data.countdown);
    });

    socket.on("aviator_flight_start", () => {
      statusRef.current = "FLYING";
      targetMultiplierRef.current = 1.0;
      setStatus("FLYING");
      setCurrentMultiplier(1.0);
    });

    socket.on("aviator_tick", (data) => {
      statusRef.current = "FLYING";
      targetMultiplierRef.current = data.multiplier;

      // Throttle React state update to ~100ms for smooth 60fps rendering without React thrashing
      const now = Date.now();
      if (now - lastStateUpdateRef.current > 100) {
        lastStateUpdateRef.current = now;
        setStatus("FLYING");
        setCurrentMultiplier(data.multiplier);
      }
    });

    socket.on("aviator_crashed", (data) => {
      statusRef.current = "CRASHED";
      targetMultiplierRef.current = data.crashPoint;
      setStatus("CRASHED");
      setCurrentMultiplier(data.crashPoint);
      fetchData();
      refreshUser();
    });

    socket.on("aviator_new_bet", (data: LivePlayerBet) => {
      setLivePlayers((prev) => [data, ...prev.slice(0, 20)]);
    });

    socket.on("aviator_user_cashed_out", (data) => {
      setLivePlayers((prev) =>
        prev.map((p) =>
          p.betId === data.betId
            ? { ...p, cashedOut: true, multiplier: data.multiplier, winAmount: data.winAmount }
            : p
        )
      );
    });

    return () => {
      socket.off("aviator_betting_start");
      socket.off("aviator_countdown_tick");
      socket.off("aviator_flight_start");
      socket.off("aviator_tick");
      socket.off("aviator_crashed");
      socket.off("aviator_new_bet");
      socket.off("aviator_user_cashed_out");
    };
  }, [socket, user]);

  // Bet 1 Handlers
  const handlePlaceBet1 = async () => {
    if (!user) return alert("Please login first to bet");
    const maxBonus1 = Number((bet1Amount / 3).toFixed(2));
    const bonusToUse1 = Math.min(user.wallet?.bonusBalance || 0, maxBonus1);
    const realNeeded1 = Number((bet1Amount - bonusToUse1).toFixed(2));

    if (user.wallet.balance < realNeeded1) {
      if (user.wallet.balance <= 0 && (user.wallet.bonusBalance || 0) > 0) {
        return alert("Real Cash Required: You need Real Cash to use Bonus Wallet (₹1 bonus for every ₹2 real cash). Please recharge!");
      }
      return alert(`Insufficient Real Cash. You need at least ₹${realNeeded1} Real Cash (with ₹${bonusToUse1} bonus applied). Please recharge!`);
    }

    setLoading1(true);
    try {
      const res = await apiRequest("/games/aviator/bet", {
        method: "POST",
        body: JSON.stringify({
          betAmount: bet1Amount,
          autoCashout: auto1Enabled && parseFloat(auto1Multiplier) > 1.01 ? parseFloat(auto1Multiplier) : undefined,
        }),
      });
      setActiveBet1Id(res.bet.id);
      refreshUser();
    } catch (err: any) {
      alert(err.message || "Failed to place bet");
    } finally {
      setLoading1(false);
    }
  };

  const handleCashout1 = async () => {
    if (!activeBet1Id || hasCashedOut1 || status !== "FLYING") return;
    setLoading1(true);
    try {
      const res = await apiRequest("/games/aviator/cashout", {
        method: "POST",
        body: JSON.stringify({ betId: activeBet1Id }),
      });
      setHasCashedOut1(true);
      setWin1Amount(res.result.winAmount);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      refreshUser();
    } catch (err: any) {
      alert(err.message || "Cashout failed");
    } finally {
      setLoading1(false);
    }
  };

  // Bet 2 Handlers
  const handlePlaceBet2 = async () => {
    if (!user) return alert("Please login first to bet");
    const maxBonus2 = Number((bet2Amount / 3).toFixed(2));
    const bonusToUse2 = Math.min(user.wallet?.bonusBalance || 0, maxBonus2);
    const realNeeded2 = Number((bet2Amount - bonusToUse2).toFixed(2));

    if (user.wallet.balance < realNeeded2) {
      if (user.wallet.balance <= 0 && (user.wallet.bonusBalance || 0) > 0) {
        return alert("Real Cash Required: You need Real Cash to use Bonus Wallet (₹1 bonus for every ₹2 real cash). Please recharge!");
      }
      return alert(`Insufficient Real Cash. You need at least ₹${realNeeded2} Real Cash (with ₹${bonusToUse2} bonus applied). Please recharge!`);
    }

    setLoading2(true);
    try {
      const res = await apiRequest("/games/aviator/bet", {
        method: "POST",
        body: JSON.stringify({
          betAmount: bet2Amount,
          autoCashout: auto2Enabled && parseFloat(auto2Multiplier) > 1.01 ? parseFloat(auto2Multiplier) : undefined,
        }),
      });
      setActiveBet2Id(res.bet.id);
      refreshUser();
    } catch (err: any) {
      alert(err.message || "Failed to place bet");
    } finally {
      setLoading2(false);
    }
  };

  const handleCashout2 = async () => {
    if (!activeBet2Id || hasCashedOut2 || status !== "FLYING") return;
    setLoading2(true);
    try {
      const res = await apiRequest("/games/aviator/cashout", {
        method: "POST",
        body: JSON.stringify({ betId: activeBet2Id }),
      });
      setHasCashedOut2(true);
      setWin2Amount(res.result.winAmount);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      refreshUser();
    } catch (err: any) {
      alert(err.message || "Cashout failed");
    } finally {
      setLoading2(false);
    }
  };

  // 60-FPS Decoupled Hardware-Accelerated Canvas Engine (Zero Lag / Smooth Flight)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = 360;
    let height = 230;

    const updateCanvasSize = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const newW = Math.floor(rect.width) || 360;
      const newH = 230;
      if (canvas.width !== newW || canvas.height !== newH) {
        width = canvas.width = newW;
        height = canvas.height = newH;
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    let displayedMultiplier = 1.0;
    let running = true;

    const render = () => {
      if (!running) return;

      const currentStatus = statusRef.current;
      const targetMul = targetMultiplierRef.current;
      const currentCountdown = countdownRef.current;

      // Smoothly interpolate displayed multiplier at 60 FPS
      if (currentStatus === "FLYING") {
        displayedMultiplier += (targetMul - displayedMultiplier) * 0.22;
        if (displayedMultiplier < 1.0) displayedMultiplier = 1.0;
      } else if (currentStatus === "CRASHED") {
        displayedMultiplier = targetMul;
      } else {
        displayedMultiplier = 1.0;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Spribe Black/Purple Gradient Background
      ctx.fillStyle = "#0d0614";
      ctx.fillRect(0, 0, width, height);

      // 2. Light radial speed lines from bottom left
      ctx.strokeStyle = "rgba(168, 85, 247, 0.08)";
      ctx.lineWidth = 1;
      const cx = 20;
      const cy = height - 20;
      for (let angle = 0; angle <= Math.PI / 2; angle += Math.PI / 18) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(angle) * (width * 1.5),
          cy - Math.sin(angle) * (height * 1.5)
        );
        ctx.stroke();
      }

      if (currentStatus === "BETTING") {
        // Waiting bar
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("WAITING FOR NEXT ROUND", width / 2, height / 2 - 10);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px monospace";
        ctx.fillText(`${currentCountdown}s`, width / 2, height / 2 + 25);
      } else if (currentStatus === "FLYING" || currentStatus === "CRASHED") {
        // Curve coordinates
        const progress = Math.min(1.0, (displayedMultiplier - 1.0) / 6.0);
        const startX = 20;
        const startY = height - 20;
        const endX = startX + (width - 70) * Math.min(1.0, progress * 1.1 + 0.1);
        const endY = startY - (height - 60) * Math.pow(progress, 0.7);

        const cpX = startX + (endX - startX) * 0.6;
        const cpY = startY;

        // Red Fill under curve
        const gradient = ctx.createLinearGradient(0, endY, 0, height);
        gradient.addColorStop(0, "rgba(220, 38, 38, 0.45)");
        gradient.addColorStop(1, "rgba(220, 38, 38, 0.0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fill();

        // Thick Red Line
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.stroke();

        // Draw Spribe Propeller Airplane
        if (currentStatus === "FLYING") {
          ctx.save();
          ctx.translate(endX, endY);
          const angle = -Math.atan2(startY - endY, endX - startX) * 0.5;
          ctx.rotate(angle);

          // Airplane Body (Bright Red)
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(-14, -8);
          ctx.lineTo(-9, 0);
          ctx.lineTo(-14, 8);
          ctx.closePath();
          ctx.fill();

          // Wings with "X" mark (Spribe Signature)
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.moveTo(3, 0);
          ctx.lineTo(-5, -16);
          ctx.lineTo(0, -16);
          ctx.lineTo(5, 0);
          ctx.closePath();
          ctx.fill();

          // Propeller blade in front
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(16, -6, 2, 12);

          // White "X" on wing
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px sans-serif";
          ctx.fillText("X", -3, -7);

          ctx.restore();
        } else if (currentStatus === "CRASHED") {
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("FLEW AWAY!", width / 2, height / 2 - 12);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      window.removeEventListener("resize", updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#07040a] text-white pb-20 select-none flex flex-col">
      {/* 1. TOP SPRIBE HEADER */}
      <div className="bg-[#11091a] border-b border-purple-950/60 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1 text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="font-black text-rose-500 tracking-wider text-base font-serif italic">
            Aviator
          </span>
          <span className="text-[10px] bg-red-600/20 text-red-400 px-1.5 py-0.2 rounded font-mono border border-red-500/30">
            SPRIBE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Real Cash</span>
            <div className="text-xs font-black font-mono text-emerald-400 flex items-center justify-end gap-1">
              <span>₹{user?.wallet?.balance ? user.wallet.balance.toFixed(2) : "0.00"}</span>
              {Boolean(user?.wallet?.bonusBalance && user.wallet.bonusBalance > 0) && (
                <span className="text-amber-400 text-[10px] bg-amber-500/10 border border-amber-500/20 px-1 rounded">
                  +₹{Math.floor(user?.wallet?.bonusBalance || 0)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <a
            href="https://t.me/Raayanhere"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
            title="Customer Care (@Raayanhere)"
          >
            <Headphones className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 2. PAST MULTIPLIERS RIBBON (Colored multipliers like in Screenshot 3) */}
      <div className="bg-[#0b0512] border-b border-purple-950/40 px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[9px] text-slate-500 uppercase font-bold shrink-0">
          History
        </span>
        {history.slice(0, 15).map((h) => {
          const isHigh = h.crashPoint >= 10.0;
          const isMedium = h.crashPoint >= 2.0;

          return (
            <span
              key={h.id}
              className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono shrink-0 shadow-sm ${
                isHigh
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : isMedium
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
              }`}
            >
              {h.crashPoint.toFixed(2)}x
            </span>
          );
        })}
      </div>

      {/* 3. RADAR FLIGHT ARENA */}
      <div className="p-2 relative">
        <div className="relative rounded-2xl overflow-hidden border border-purple-950 shadow-2xl">
          <canvas ref={canvasRef} className="w-full block" />

          {/* Central Multiplier Indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {status === "FLYING" && (
              <div className="text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_4px_16px_rgba(239,68,68,0.7)]">
                {currentMultiplier.toFixed(2)}x
              </div>
            )}
            {status === "CRASHED" && (
              <div className="text-3xl font-black font-mono text-red-500 mt-8">
                @ {currentMultiplier.toFixed(2)}x
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. SPRIBE DUAL BETTING PANELS (Side by Side - Screenshot 3 Style) */}
      <div className="px-2 grid grid-cols-2 gap-2">
        {/* PANEL 1 */}
        <div className="bg-[#120b1c] border border-purple-900/40 rounded-2xl p-2.5 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-center pb-1 text-[10px] font-bold text-slate-400 border-b border-purple-950">
            <span>BET 1</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={auto1Enabled}
                onChange={(e) => setAuto1Enabled(e.target.checked)}
                className="w-3 h-3 accent-emerald-500 rounded"
              />
              <span className="text-[9px]">Auto</span>
            </label>
          </div>

          {/* Amount input */}
          <div className="flex items-center justify-between bg-black/40 rounded-xl p-1 mt-2 border border-purple-950">
            <button
              onClick={() => setBet1Amount(Math.max(10, bet1Amount - 10))}
              className="w-7 h-7 rounded-lg bg-slate-800 text-white font-black flex items-center justify-center text-sm"
            >
              -
            </button>
            <span className="font-mono font-bold text-xs text-white">₹{bet1Amount}</span>
            <button
              onClick={() => setBet1Amount(bet1Amount + 10)}
              className="w-7 h-7 rounded-lg bg-slate-800 text-white font-black flex items-center justify-center text-sm"
            >
              +
            </button>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {[10, 50, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setBet1Amount(amt)}
                className="py-0.5 rounded bg-slate-900 text-[9px] font-bold text-slate-400 hover:text-white"
              >
                {amt}
              </button>
            ))}
          </div>

          {auto1Enabled && (
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
              <span>Auto Cashout:</span>
              <input
                type="number"
                step="0.1"
                min="1.1"
                value={auto1Multiplier}
                onChange={(e) => setAuto1Multiplier(e.target.value)}
                className="w-12 bg-black border border-purple-900 rounded px-1 py-0.5 font-mono text-center text-amber-400 font-bold"
              />
            </div>
          )}

          {/* Big Action Button */}
          <div className="mt-2.5">
            {activeBet1Id ? (
              hasCashedOut1 ? (
                <div className="py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-center font-bold text-xs">
                  +₹{win1Amount.toFixed(1)}
                </div>
              ) : status === "FLYING" ? (
                <button
                  disabled={loading1}
                  onClick={handleCashout1}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs uppercase animate-pulse shadow-lg"
                >
                  Cash Out ₹{(bet1Amount * currentMultiplier).toFixed(1)}
                </button>
              ) : status === "BETTING" ? (
                <div className="py-3 rounded-xl bg-amber-500/20 text-amber-300 text-center text-[10px] font-bold border border-amber-500/40">
                  Waiting...
                </div>
              ) : (
                <div className="py-3 rounded-xl bg-rose-500/20 text-rose-400 text-center text-[10px] font-bold">
                  Flew Away
                </div>
              )
            ) : (
              <button
                disabled={status !== "BETTING" || loading1}
                onClick={handlePlaceBet1}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition ${
                  status === "BETTING"
                    ? "bg-[#28a745] hover:bg-[#218838] text-white shadow-green-950/40"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                Bet {bet1Amount} INR
              </button>
            )}
          </div>
        </div>

        {/* PANEL 2 */}
        <div className="bg-[#120b1c] border border-purple-900/40 rounded-2xl p-2.5 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-center pb-1 text-[10px] font-bold text-slate-400 border-b border-purple-950">
            <span>BET 2</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={auto2Enabled}
                onChange={(e) => setAuto2Enabled(e.target.checked)}
                className="w-3 h-3 accent-emerald-500 rounded"
              />
              <span className="text-[9px]">Auto</span>
            </label>
          </div>

          {/* Amount input */}
          <div className="flex items-center justify-between bg-black/40 rounded-xl p-1 mt-2 border border-purple-950">
            <button
              onClick={() => setBet2Amount(Math.max(10, bet2Amount - 10))}
              className="w-7 h-7 rounded-lg bg-slate-800 text-white font-black flex items-center justify-center text-sm"
            >
              -
            </button>
            <span className="font-mono font-bold text-xs text-white">₹{bet2Amount}</span>
            <button
              onClick={() => setBet2Amount(bet2Amount + 10)}
              className="w-7 h-7 rounded-lg bg-slate-800 text-white font-black flex items-center justify-center text-sm"
            >
              +
            </button>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {[10, 50, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setBet2Amount(amt)}
                className="py-0.5 rounded bg-slate-900 text-[9px] font-bold text-slate-400 hover:text-white"
              >
                {amt}
              </button>
            ))}
          </div>

          {auto2Enabled && (
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
              <span>Auto Cashout:</span>
              <input
                type="number"
                step="0.1"
                min="1.1"
                value={auto2Multiplier}
                onChange={(e) => setAuto2Multiplier(e.target.value)}
                className="w-12 bg-black border border-purple-900 rounded px-1 py-0.5 font-mono text-center text-amber-400 font-bold"
              />
            </div>
          )}

          {/* Big Action Button */}
          <div className="mt-2.5">
            {activeBet2Id ? (
              hasCashedOut2 ? (
                <div className="py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-center font-bold text-xs">
                  +₹{win2Amount.toFixed(1)}
                </div>
              ) : status === "FLYING" ? (
                <button
                  disabled={loading2}
                  onClick={handleCashout2}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs uppercase animate-pulse shadow-lg"
                >
                  Cash Out ₹{(bet2Amount * currentMultiplier).toFixed(1)}
                </button>
              ) : status === "BETTING" ? (
                <div className="py-3 rounded-xl bg-amber-500/20 text-amber-300 text-center text-[10px] font-bold border border-amber-500/40">
                  Waiting...
                </div>
              ) : (
                <div className="py-3 rounded-xl bg-rose-500/20 text-rose-400 text-center text-[10px] font-bold">
                  Flew Away
                </div>
              )
            ) : (
              <button
                disabled={status !== "BETTING" || loading2}
                onClick={handlePlaceBet2}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition ${
                  status === "BETTING"
                    ? "bg-[#28a745] hover:bg-[#218838] text-white shadow-green-950/40"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                Bet {bet2Amount} INR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. LIVE PLAYERS & MY BETS DRAWER */}
      <div className="px-2 mt-3">
        <div className="bg-[#120b1c] border border-purple-950 rounded-2xl p-3 shadow-lg">
          <div className="flex border-b border-purple-950/80 pb-2 text-xs font-bold text-slate-400 gap-4">
            <button
              onClick={() => setSideTab("ALL")}
              className={`pb-1 flex items-center gap-1 ${
                sideTab === "ALL" ? "text-rose-400 border-b-2 border-rose-500" : ""
              }`}
            >
              <Users className="w-3.5 h-3.5" /> All Bets ({livePlayers.length})
            </button>
            <button
              onClick={() => setSideTab("MY")}
              className={`pb-1 flex items-center gap-1 ${
                sideTab === "MY" ? "text-rose-400 border-b-2 border-rose-500" : ""
              }`}
            >
              <History className="w-3.5 h-3.5" /> My Bets
            </button>
          </div>

          <div className="divide-y divide-purple-950/40 max-h-44 overflow-y-auto mt-2">
            {sideTab === "ALL" &&
              livePlayers.map((player, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-[11px]">{player.phone}</span>
                    <span className="text-slate-300">₹{player.betAmount}</span>
                  </div>
                  <div>
                    {player.cashedOut ? (
                      <span className="text-emerald-400 font-mono font-black text-xs">
                        {player.multiplier?.toFixed(2)}x (+₹{player.winAmount?.toFixed(1)})
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">In Flight</span>
                    )}
                  </div>
                </div>
              ))}

            {sideTab === "MY" &&
              myBets.map((b) => (
                <div key={b.id} className="flex justify-between items-center py-1.5 text-xs">
                  <span className="font-mono text-slate-400">{b.round.roundNumber}</span>
                  <span className="text-slate-300">₹{b.betAmount}</span>
                  <div>
                    {b.status === "CASHED_OUT" ? (
                      <span className="text-emerald-400 font-bold font-mono">
                        {b.cashoutMultiplier}x (+₹{b.winAmount})
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold">Crashed</span>
                    )}
                  </div>
                </div>
              ))}

            {sideTab === "ALL" && livePlayers.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                Waiting for flight participants...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
