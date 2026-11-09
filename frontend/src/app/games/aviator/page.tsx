"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { apiRequest } from "../../../lib/api";
import confetti from "canvas-confetti";
import { AviatorSoundEngine } from "../../../lib/SoundEngine";
import { ParticlePool, ScreenShake, drawSpribePlane } from "../../../lib/AviatorVisuals";
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
  const [queuedNextRound1, setQueuedNextRound1] = useState<boolean>(false);

  // DUAL BET PANEL 2
  const [bet2Amount, setBet2Amount] = useState<number>(10);
  const [auto2Enabled, setAuto2Enabled] = useState<boolean>(false);
  const [auto2Multiplier, setAuto2Multiplier] = useState<string>("5.00");
  const [activeBet2Id, setActiveBet2Id] = useState<string | null>(null);
  const [hasCashedOut2, setHasCashedOut2] = useState<boolean>(false);
  const [win2Amount, setWin2Amount] = useState<number>(0);
  const [loading2, setLoading2] = useState<boolean>(false);
  const [queuedNextRound2, setQueuedNextRound2] = useState<boolean>(false);

  // Canvas & High-Performance Animation Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const statusRef = useRef<"BETTING" | "FLYING" | "CRASHED">(status);
  const targetMultiplierRef = useRef<number>(currentMultiplier);
  const countdownRef = useRef<number>(countdown);
  const lastStateUpdateRef = useRef<number>(0);
  const multiplierDisplayRef = useRef<HTMLDivElement | null>(null);

  // Procedural Sound & Visual FX Refs (From Spribe Engine)
  const soundEngineRef = useRef<AviatorSoundEngine | null>(null);
  const particlesRef = useRef<ParticlePool>(new ParticlePool());
  const screenShakeRef = useRef<ScreenShake>(new ScreenShake());
  const crashTimestampRef = useRef<number | null>(null);
  const lastPlanePosRef = useRef<{ x: number; y: number }>({ x: 40, y: 180 });

  useEffect(() => {
    soundEngineRef.current = new AviatorSoundEngine();
    soundEngineRef.current.setMuted(!soundEnabled);
    return () => {
      soundEngineRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (soundEngineRef.current) {
      soundEngineRef.current.setMuted(!soundEnabled);
    }
  }, [soundEnabled]);

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
      crashTimestampRef.current = null;
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
      soundEngineRef.current?.tick();
      setStatus("BETTING");
      setCountdown(data.countdown);
    });

    socket.on("aviator_flight_start", () => {
      statusRef.current = "FLYING";
      targetMultiplierRef.current = 1.0;
      crashTimestampRef.current = null;
      particlesRef.current.reset();
      soundEngineRef.current?.flightStart();
      setStatus("FLYING");
      setCurrentMultiplier(1.0);
    });

    socket.on("aviator_tick", (data) => {
      statusRef.current = "FLYING";
      targetMultiplierRef.current = data.multiplier;
      soundEngineRef.current?.updateMultiplier(data.multiplier);

      // Throttle React state update to ~250ms (cuts 70% of main thread diffing load; 60fps canvas & ref handle animation)
      const now = Date.now();
      if (now - lastStateUpdateRef.current > 250) {
        lastStateUpdateRef.current = now;
        setStatus("FLYING");
        setCurrentMultiplier(data.multiplier);
      }
    });

    socket.on("aviator_crashed", (data) => {
      statusRef.current = "CRASHED";
      targetMultiplierRef.current = data.crashPoint;
      crashTimestampRef.current = performance.now();
      screenShakeRef.current.trigger(10, 400);
      particlesRef.current.spawnCrashBurst(lastPlanePosRef.current.x, lastPlanePosRef.current.y);
      soundEngineRef.current?.crash();
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

  // Bet 1 Handlers (Optimistic UI for Instant Mobile Interaction)
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

    // 0ms Optimistic state update
    const tempId = "pending_" + Date.now();
    setActiveBet1Id(tempId);
    if (user.wallet) {
      user.wallet.balance = Math.max(0, user.wallet.balance - realNeeded1);
    }

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
      setActiveBet1Id(null);
      refreshUser();
      alert(err.message || "Failed to place bet");
    }
  };

  const handleCashout1 = async () => {
    if (!activeBet1Id || hasCashedOut1 || status !== "FLYING") return;

    // 0ms Optimistic cashout feedback
    const optimisticMultiplier = targetMultiplierRef.current;
    const optimisticWin = Number((bet1Amount * optimisticMultiplier).toFixed(1));
    setHasCashedOut1(true);
    setWin1Amount(optimisticWin);
    soundEngineRef.current?.cashout();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    try {
      const res = await apiRequest("/games/aviator/cashout", {
        method: "POST",
        body: JSON.stringify({ betId: activeBet1Id }),
      });
      setWin1Amount(res.result.winAmount);
      refreshUser();
    } catch (err: any) {
      setHasCashedOut1(false);
      refreshUser();
      alert(err.message || "Cashout failed");
    }
  };

  // Bet 2 Handlers (Optimistic UI for Instant Mobile Interaction)
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

    // 0ms Optimistic state update
    const tempId = "pending_" + Date.now();
    setActiveBet2Id(tempId);
    if (user.wallet) {
      user.wallet.balance = Math.max(0, user.wallet.balance - realNeeded2);
    }

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
      setActiveBet2Id(null);
      refreshUser();
      alert(err.message || "Failed to place bet");
    }
  };

  const handleCashout2 = async () => {
    if (!activeBet2Id || hasCashedOut2 || status !== "FLYING") return;

    // 0ms Optimistic cashout feedback
    const optimisticMultiplier = targetMultiplierRef.current;
    const optimisticWin = Number((bet2Amount * optimisticMultiplier).toFixed(1));
    setHasCashedOut2(true);
    setWin2Amount(optimisticWin);
    soundEngineRef.current?.cashout();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    try {
      const res = await apiRequest("/games/aviator/cashout", {
        method: "POST",
        body: JSON.stringify({ betId: activeBet2Id }),
      });
      setWin2Amount(res.result.winAmount);
      refreshUser();
    } catch (err: any) {
      setHasCashedOut2(false);
      refreshUser();
      alert(err.message || "Cashout failed");
    }
  };

  const handleQueueBet1 = () => {
    if (!user) return alert("Please login first to bet");
    const maxBonus1 = Number((bet1Amount / 3).toFixed(2));
    const bonusToUse1 = Math.min(user.wallet?.bonusBalance || 0, maxBonus1);
    const realNeeded1 = Number((bet1Amount - bonusToUse1).toFixed(2));
    if ((user.wallet?.balance || 0) < realNeeded1) {
      if ((user.wallet?.balance || 0) <= 0 && (user.wallet?.bonusBalance || 0) > 0) {
        return alert("Real Cash Required: You need Real Cash to use Bonus Wallet (₹1 bonus for every ₹2 real cash). Please recharge!");
      }
      return alert(`Insufficient Real Cash. You need at least ₹${realNeeded1} Real Cash. Please recharge!`);
    }
    setQueuedNextRound1(true);
  };

  const handleQueueBet2 = () => {
    if (!user) return alert("Please login first to bet");
    const maxBonus2 = Number((bet2Amount / 3).toFixed(2));
    const bonusToUse2 = Math.min(user.wallet?.bonusBalance || 0, maxBonus2);
    const realNeeded2 = Number((bet2Amount - bonusToUse2).toFixed(2));
    if ((user.wallet?.balance || 0) < realNeeded2) {
      if ((user.wallet?.balance || 0) <= 0 && (user.wallet?.bonusBalance || 0) > 0) {
        return alert("Real Cash Required: You need Real Cash to use Bonus Wallet (₹1 bonus for every ₹2 real cash). Please recharge!");
      }
      return alert(`Insufficient Real Cash. You need at least ₹${realNeeded2} Real Cash. Please recharge!`);
    }
    setQueuedNextRound2(true);
  };

  // Automatically submit queued bets as soon as countdown begins
  useEffect(() => {
    if (status === "BETTING" && queuedNextRound1 && !activeBet1Id && !loading1) {
      setQueuedNextRound1(false);
      handlePlaceBet1();
    }
  }, [status, queuedNextRound1, activeBet1Id, loading1]);

  useEffect(() => {
    if (status === "BETTING" && queuedNextRound2 && !activeBet2Id && !loading2) {
      setQueuedNextRound2(false);
      handlePlaceBet2();
    }
  }, [status, queuedNextRound2, activeBet2Id, loading2]);

  // 60-FPS Decoupled Hardware-Accelerated Canvas Engine with Spribe Plane & Particle Trail
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
    let lastTime = performance.now();
    let frameCount = 0;

    const render = (time: number) => {
      if (!running) return;

      const dtMs = Math.min(time - lastTime, 50);
      lastTime = time;
      frameCount++;

      const currentStatus = statusRef.current;
      const targetMul = targetMultiplierRef.current;
      const currentCountdown = countdownRef.current;

      // Smoothly interpolate displayed multiplier at 60 FPS
      if (currentStatus === "FLYING") {
        displayedMultiplier += (targetMul - displayedMultiplier) * 0.22;
        if (displayedMultiplier < 1.0) displayedMultiplier = 1.0;
        if (multiplierDisplayRef.current) {
          multiplierDisplayRef.current.textContent = `${displayedMultiplier.toFixed(2)}x`;
        }
      } else if (currentStatus === "CRASHED") {
        displayedMultiplier = targetMul;
      } else {
        displayedMultiplier = 1.0;
      }

      // Update screen shake
      screenShakeRef.current.update(dtMs);

      ctx.save();
      if (screenShakeRef.current.isActive()) {
        ctx.translate(screenShakeRef.current.offsetX, screenShakeRef.current.offsetY);
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

      // 3. Subtle grid axes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 10);
      ctx.lineTo(cx, cy);
      ctx.lineTo(width - 10, cy);
      ctx.stroke();

      if (currentStatus === "BETTING") {
        // Waiting bar
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("WAITING FOR NEXT ROUND", width / 2, height / 2 - 10);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px monospace";
        ctx.fillText(`${currentCountdown}s`, width / 2, height / 2 + 25);

        // Update & render any lingering particles
        particlesRef.current.update(dtMs);
        particlesRef.current.draw(ctx);
      } else if (currentStatus === "FLYING" || currentStatus === "CRASHED") {
        // Curve coordinates
        const progress = Math.min(1.0, (displayedMultiplier - 1.0) / 6.0);
        const startX = 20;
        const startY = height - 20;
        const endX = startX + (width - 70) * Math.min(1.0, progress * 1.1 + 0.1);
        const endY = startY - (height - 60) * Math.pow(progress, 0.7);

        const cpX = startX + (endX - startX) * 0.6;
        const cpY = startY;

        lastPlanePosRef.current = { x: endX, y: endY };

        // Red Fill under curve
        const gradient = ctx.createLinearGradient(0, endY, 0, height);
        gradient.addColorStop(0, "rgba(220, 38, 38, 0.42)");
        gradient.addColorStop(0.5, "rgba(220, 38, 38, 0.14)");
        gradient.addColorStop(1, "rgba(220, 38, 38, 0.0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fill();

        // Glowing Thick Red Line
        ctx.save();
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 8;
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.stroke();
        ctx.restore();

        if (currentStatus === "FLYING") {
          // Spawn fiery exhaust smoke trail every other frame
          if (frameCount % 2 === 0) {
            particlesRef.current.spawnTrail(endX - 14, endY + 2);
          }
          particlesRef.current.update(dtMs);
          particlesRef.current.draw(ctx);

          // Draw vector Spribe Airplane with spinning propeller & cockpit reflection
          const angle = -Math.atan2(startY - endY, endX - startX) * 0.48;
          drawSpribePlane(ctx, endX, endY, angle, time / 1000, 0.95);
        } else if (currentStatus === "CRASHED") {
          // Fly-away animation!
          const crashTime = crashTimestampRef.current || time;
          const flyAwayMs = time - crashTime;
          const flyAwayT = Math.min(flyAwayMs / 1200, 1.0);

          const flyAwayX = endX + flyAwayT * 150;
          const flyAwayY = endY - flyAwayT * 220;
          const flyAwayAngle = -0.35 - flyAwayT * 0.55;
          const flyAwayAlpha = Math.max(0, 1 - flyAwayT * flyAwayT);

          // Trail during fly-away
          if (flyAwayT < 0.6 && frameCount % 2 === 0) {
            particlesRef.current.spawnTrail(flyAwayX - 12, flyAwayY);
          }

          particlesRef.current.update(dtMs);
          particlesRef.current.draw(ctx);

          if (flyAwayAlpha > 0.02) {
            ctx.save();
            ctx.globalAlpha = flyAwayAlpha;
            drawSpribePlane(ctx, flyAwayX, flyAwayY, flyAwayAngle, time / 1000, 0.95 * (1 - flyAwayT * 0.3));
            ctx.restore();
          }

          // Center "FLEW AWAY!" header
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("FLEW AWAY!", width / 2, height / 2 - 12);
        }
      }

      ctx.restore();

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
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundEngineRef.current?.setMuted(!next);
            }}
            className="p-1 rounded text-slate-400 hover:text-white touch-manipulation transition"
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
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
              <div
                ref={multiplierDisplayRef}
                className="text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_4px_16px_rgba(239,68,68,0.7)]"
              >
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
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg bg-slate-800 active:bg-slate-700 text-white font-black flex items-center justify-center text-base touch-manipulation"
            >
              -
            </button>
            <span className="font-mono font-bold text-xs text-white">₹{bet1Amount}</span>
            <button
              onClick={() => setBet1Amount(bet1Amount + 10)}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg bg-slate-800 active:bg-slate-700 text-white font-black flex items-center justify-center text-base touch-manipulation"
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
                className="py-1.5 min-h-[28px] rounded bg-slate-900 active:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white touch-manipulation"
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
                <div className="flex flex-col gap-1.5">
                  <div className="py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-center font-bold text-xs">
                    +₹{win1Amount.toFixed(1)} Cashed Out!
                  </div>
                  {queuedNextRound1 ? (
                    <button
                      onClick={() => setQueuedNextRound1(false)}
                      className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs uppercase active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1" />
                      Next Round Queued (Cancel)
                    </button>
                  ) : (
                    <button
                      onClick={handleQueueBet1}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase shadow-lg active:brightness-90 active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1.5"
                    >
                      Bet {bet1Amount} INR (Next Round)
                    </button>
                  )}
                </div>
              ) : status === "FLYING" ? (
                <button
                  disabled={loading1}
                  onClick={handleCashout1}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase shadow-lg active:brightness-90 active:scale-[0.98] transition touch-manipulation disabled:opacity-75 flex items-center justify-center gap-1.5"
                >
                  {loading1 ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Cashing Out...</span>
                    </>
                  ) : (
                    <span>Cash Out ₹{(bet1Amount * currentMultiplier).toFixed(1)}</span>
                  )}
                </button>
              ) : status === "BETTING" ? (
                <div className="py-3 rounded-xl bg-amber-500/20 text-amber-300 text-center text-xs font-bold border border-amber-500/40">
                  Waiting for flight...
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="py-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-center text-[10px] font-bold">
                    Flew Away @ {currentMultiplier.toFixed(2)}x
                  </div>
                  {queuedNextRound1 ? (
                    <button
                      onClick={() => setQueuedNextRound1(false)}
                      className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs uppercase active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1" />
                      Next Round Queued (Cancel)
                    </button>
                  ) : (
                    <button
                      onClick={handleQueueBet1}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase shadow-lg active:brightness-90 active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1.5"
                    >
                      Bet {bet1Amount} INR (Next Round)
                    </button>
                  )}
                </div>
              )
            ) : status === "BETTING" ? (
              <button
                disabled={loading1}
                onClick={handlePlaceBet1}
                className="w-full py-3 rounded-xl font-black text-xs uppercase shadow-lg bg-[#28a745] hover:bg-[#218838] text-white shadow-green-950/40 active:brightness-90 active:scale-[0.98] transition touch-manipulation disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading1 ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Placing Bet...</span>
                  </>
                ) : (
                  <span>Bet {bet1Amount} INR</span>
                )}
              </button>
            ) : queuedNextRound1 ? (
              <button
                onClick={() => setQueuedNextRound1(false)}
                className="w-full py-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs uppercase active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1" />
                WAITING FOR NEXT ROUND (CANCEL)
              </button>
            ) : (
              <button
                onClick={handleQueueBet1}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase shadow-lg active:brightness-90 active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1.5"
              >
                Bet {bet1Amount} INR (Next Round)
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
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg bg-slate-800 active:bg-slate-700 text-white font-black flex items-center justify-center text-base touch-manipulation"
            >
              -
            </button>
            <span className="font-mono font-bold text-xs text-white">₹{bet2Amount}</span>
            <button
              onClick={() => setBet2Amount(bet2Amount + 10)}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg bg-slate-800 active:bg-slate-700 text-white font-black flex items-center justify-center text-base touch-manipulation"
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
                className="py-1.5 min-h-[28px] rounded bg-slate-900 active:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white touch-manipulation"
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
                <div className="flex flex-col gap-1.5">
                  <div className="py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-center font-bold text-xs">
                    +₹{win2Amount.toFixed(1)} Cashed Out!
                  </div>
                  {queuedNextRound2 ? (
                    <button
                      onClick={() => setQueuedNextRound2(false)}
                      className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs uppercase active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1" />
                      Next Round Queued (Cancel)
                    </button>
                  ) : (
                    <button
                      onClick={handleQueueBet2}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase shadow-lg active:brightness-90 active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1.5"
                    >
                      Bet {bet2Amount} INR (Next Round)
                    </button>
                  )}
                </div>
              ) : status === "FLYING" ? (
                <button
                  disabled={loading2}
                  onClick={handleCashout2}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase shadow-lg active:brightness-90 active:scale-[0.98] transition touch-manipulation disabled:opacity-75 flex items-center justify-center gap-1.5"
                >
                  {loading2 ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Cashing Out...</span>
                    </>
                  ) : (
                    <span>Cash Out ₹{(bet2Amount * currentMultiplier).toFixed(1)}</span>
                  )}
                </button>
              ) : status === "BETTING" ? (
                <div className="py-3 rounded-xl bg-amber-500/20 text-amber-300 text-center text-xs font-bold border border-amber-500/40">
                  Waiting for flight...
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="py-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-center text-[10px] font-bold">
                    Flew Away @ {currentMultiplier.toFixed(2)}x
                  </div>
                  {queuedNextRound2 ? (
                    <button
                      onClick={() => setQueuedNextRound2(false)}
                      className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs uppercase active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1" />
                      Next Round Queued (Cancel)
                    </button>
                  ) : (
                    <button
                      onClick={handleQueueBet2}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase shadow-lg active:brightness-90 active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1.5"
                    >
                      Bet {bet2Amount} INR (Next Round)
                    </button>
                  )}
                </div>
              )
            ) : status === "BETTING" ? (
              <button
                disabled={loading2}
                onClick={handlePlaceBet2}
                className="w-full py-3 rounded-xl font-black text-xs uppercase shadow-lg bg-[#28a745] hover:bg-[#218838] text-white shadow-green-950/40 active:brightness-90 active:scale-[0.98] transition touch-manipulation disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading2 ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Placing Bet...</span>
                  </>
                ) : (
                  <span>Bet {bet2Amount} INR</span>
                )}
              </button>
            ) : queuedNextRound2 ? (
              <button
                onClick={() => setQueuedNextRound2(false)}
                className="w-full py-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs uppercase active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1" />
                WAITING FOR NEXT ROUND (CANCEL)
              </button>
            ) : (
              <button
                onClick={handleQueueBet2}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase shadow-lg active:brightness-90 active:scale-[0.98] transition touch-manipulation flex items-center justify-center gap-1.5"
              >
                Bet {bet2Amount} INR (Next Round)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. LIVE PLAYERS & MY BETS DRAWER */}
      <div className="px-2 mt-3">
        <div className="bg-[#120b1c] border border-purple-950 rounded-2xl p-3 shadow-lg">
          <div className="flex border-b border-purple-950/80 pb-2 text-xs font-bold text-slate-400 gap-2">
            <button
              onClick={() => setSideTab("ALL")}
              className={`min-h-[36px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 touch-manipulation transition ${
                sideTab === "ALL" ? "text-rose-400 bg-rose-500/15 border border-rose-500/30" : "hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> All Bets ({livePlayers.length})
            </button>
            <button
              onClick={() => setSideTab("MY")}
              className={`min-h-[36px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 touch-manipulation transition ${
                sideTab === "MY" ? "text-rose-400 bg-rose-500/15 border border-rose-500/30" : "hover:text-white"
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
