"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  WingoLogoGraphic,
  AviatorLogoGraphic,
  AviatorVipGraphic,
  ChickenRoadGraphic,
  MoneyComingGraphic,
  VortexGraphic,
} from "../components/CasinoGameCards";
import {
  Flame,
  Megaphone,
  ChevronRight,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gift,
  Trophy,
  Dices,
  CircleDot,
  Plane,
  ShieldCheck,
  Send,
  Headphones,
  X,
  RotateCcw,
  Lock,
  Zap,
} from "lucide-react";

interface WinnerEvent {
  id: string;
  phone: string;
  game: string;
  amount: string;
  color: string;
  vip: string;
  avatar: string;
  isNew?: boolean;
}

const INITIAL_WINNERS: WinnerEvent[] = [
  { id: "w-1", phone: "9876****10", game: "Win Go 30s (Green)", amount: "₹4,850", color: "text-emerald-400", vip: "VIP 3", avatar: "👑" },
  { id: "w-2", phone: "9123****81", game: "Aviator (18.6x Cashout)", amount: "₹18,600", color: "text-rose-400", vip: "VIP 5", avatar: "🚀" },
  { id: "w-3", phone: "9988****55", game: "Win Go 30s (Red)", amount: "₹1,960", color: "text-emerald-400", vip: "VIP 2", avatar: "🎯" },
  { id: "w-4", phone: "8923****12", game: "Aviator VIP (35.0x)", amount: "₹35,000", color: "text-amber-400", vip: "VIP 6", avatar: "💎" },
  { id: "w-5", phone: "7012****34", game: "Win Go 30s (Number 7)", amount: "₹8,820", color: "text-purple-400", vip: "VIP 4", avatar: "⚡" },
];

export default function HomePage() {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Live Game States
  const [wingoTimer, setWingoTimer] = useState<number>(30);
  const [aviatorStatus, setAviatorStatus] = useState<string>("BETTING");
  const [aviatorMultiplier, setAviatorMultiplier] = useState<number>(1.0);

  // Active Category Filter
  const [activeCategory, setActiveCategory] = useState<string>("POPULAR");

  // Promotional Banner Carousel Index
  const [activeBanner, setActiveBanner] = useState<number>(0);

  // Modals
  const [isNoticeOpen, setIsNoticeOpen] = useState<boolean>(false);
  const [lockedGameModal, setLockedGameModal] = useState<string | null>(null);

  // Lucky Spin Wheel Modal
  const [isWheelOpen, setIsWheelOpen] = useState<boolean>(false);
  const [spinningWheel, setSpinningWheel] = useState<boolean>(false);
  const [wheelDegree, setWheelDegree] = useState<number>(0);
  const [wheelPrize, setWheelPrize] = useState<string | null>(null);

  // Constantly Updating Live Winners Feed (Motivational Dynamic Ticker)
  const [liveWinners, setLiveWinners] = useState<WinnerEvent[]>(INITIAL_WINNERS);

  // Auto-advance banner
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Socket listener for live game tickers
  useEffect(() => {
    if (!socket) return;

    socket.on("wingo_tick", (data) => {
      if (data.shortType === "30S" || data.gameType === "30SEC") {
        setWingoTimer(data.timeLeft);
      }
    });

    socket.on("aviator_tick", (data) => {
      setAviatorStatus("FLYING");
      setAviatorMultiplier(data.multiplier);
    });

    socket.on("aviator_crashed", () => {
      setAviatorStatus("CRASHED");
    });

    socket.on("aviator_betting_start", () => {
      setAviatorStatus("BETTING");
      setAviatorMultiplier(1.0);
    });

    return () => {
      socket.off("wingo_tick");
      socket.off("aviator_tick");
      socket.off("aviator_crashed");
      socket.off("aviator_betting_start");
    };
  }, [socket]);

  // Constantly update live winning feed to motivate real players
  useEffect(() => {
    const phonePool = [
      "9876****10", "9123****81", "9988****55", "8923****12", "7012****34",
      "9831****67", "6290****43", "9748****90", "8420****11", "9051****28",
      "8872****64", "7980****52", "9330****19", "8100****75", "9811****42",
      "9674****83", "7890****21", "8240****93", "9903****14", "8697****38",
      "7595****82", "9433****66", "7003****49", "8910****27", "9836****51"
    ];

    const outcomePool = [
      { game: "Win Go 30s (Red)", amount: "₹1,960", color: "text-emerald-400" },
      { game: "Win Go 30s (Green)", amount: "₹3,920", color: "text-emerald-400" },
      { game: "Win Go 30s (Violet & Red)", amount: "₹4,500", color: "text-purple-400" },
      { game: "Win Go 30s (Number 7)", amount: "₹8,820", color: "text-emerald-400" },
      { game: "Win Go 30s (Number 3)", amount: "₹4,410", color: "text-emerald-400" },
      { game: "Win Go 30s (Number 0)", amount: "₹9,000", color: "text-purple-400" },
      { game: "Win Go 30s (Big)", amount: "₹2,000", color: "text-amber-400" },
      { game: "Win Go 30s (Small)", amount: "₹1,470", color: "text-amber-400" },
      { game: "Win Go 30s (Green)", amount: "₹10,000", color: "text-emerald-400" },
      { game: "Win Go 30s (Number 8)", amount: "₹7,840", color: "text-emerald-400" },
      { game: "Aviator (2.45x Cashout)", amount: "₹2,450", color: "text-rose-400" },
      { game: "Aviator (4.80x Cashout)", amount: "₹4,800", color: "text-rose-400" },
      { game: "Aviator (9.15x Cashout)", amount: "₹9,150", color: "text-rose-400" },
      { game: "Aviator (18.6x Cashout)", amount: "₹18,600", color: "text-amber-400" },
      { game: "Aviator (35.2x Super Cashout)", amount: "₹35,200", color: "text-amber-300" },
      { game: "Aviator VIP (52.0x Mega Win)", amount: "₹52,000", color: "text-yellow-300" },
      { game: "Aviator (3.12x Cashout)", amount: "₹6,240", color: "text-rose-400" },
      { game: "Aviator (12.5x Cashout)", amount: "₹12,500", color: "text-rose-400" },
      { game: "Aviator (6.40x Cashout)", amount: "₹6,400", color: "text-rose-400" },
      { game: "Win Go 1Min (Green)", amount: "₹5,880", color: "text-emerald-400" },
    ];

    const vipPool = ["VIP 1", "VIP 2", "VIP 3", "VIP 4", "VIP 5", "VIP 6"];
    const avatarPool = ["👑", "🚀", "🎯", "💎", "⚡", "🔥", "🦁", "🏆", "🌟"];

    const interval = setInterval(() => {
      const phone = phonePool[Math.floor(Math.random() * phonePool.length)];
      const outcome = outcomePool[Math.floor(Math.random() * outcomePool.length)];
      const vip = vipPool[Math.floor(Math.random() * vipPool.length)];
      const avatar = avatarPool[Math.floor(Math.random() * avatarPool.length)];

      const newWinner: WinnerEvent = {
        id: Math.random().toString(36).substring(2, 9),
        phone,
        game: outcome.game,
        amount: outcome.amount,
        color: outcome.color,
        vip,
        avatar,
        isNew: true,
      };

      setLiveWinners((prev) => [newWinner, ...prev.slice(0, 4)]);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  // Handle Lucky Spin Wheel
  const handleSpinWheel = () => {
    if (spinningWheel) return;
    setSpinningWheel(true);
    setWheelPrize(null);

    const randomExtra = Math.floor(Math.random() * 360);
    const totalRotation = wheelDegree + 1800 + randomExtra;
    setWheelDegree(totalRotation);

    setTimeout(() => {
      setSpinningWheel(false);
      const prizes = ["₹100 Bonus Cash", "₹50 Wallet Cash", "₹200 Lucky Bonus", "₹10 Fast Cash", "₹500 VIP Jackpot"];
      const prize = prizes[Math.floor(Math.random() * prizes.length)];
      setWheelPrize(prize);
    }, 3800);
  };

  // Categories definition matching exact screenshot
  const categories = [
    { id: "POPULAR", name: "Popular", icon: "🏆", bg: "from-amber-400 to-yellow-600", active: true },
    { id: "LOTTERY", name: "Lottery", icon: "🎰", bg: "from-purple-500 to-indigo-600", active: true },
    { id: "ORIGINAL", name: "Original", icon: "✈️", bg: "from-red-600 to-rose-700", active: true },
    { id: "CASINO", name: "Casino", icon: "🎲", bg: "from-rose-500 to-pink-600", active: false },
    { id: "SLOTS", name: "Slots", icon: "🍒", bg: "from-red-500 to-orange-600", active: false },
    { id: "SPORTS", name: "Sports", icon: "⚽", bg: "from-blue-500 to-cyan-600", active: false },
    { id: "RUMMY", name: "Rummy", icon: "🃏", bg: "from-emerald-500 to-teal-600", active: false },
    { id: "FISHING", name: "Fishing", icon: "🦈", bg: "from-cyan-500 to-blue-600", active: false },
  ];

  const handleCategoryClick = (cat: typeof categories[0]) => {
    if (!cat.active) {
      setLockedGameModal(`${cat.name} Games`);
      return;
    }
    setActiveCategory(cat.id);
  };

  return (
    <div className="flex flex-col gap-3.5 px-3 py-2 pb-24 relative select-none">
      {/* 1. TOP 3D CASINO CAROUSEL BANNER */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl aspect-[16/8] sm:aspect-[16/7] bg-gradient-to-r from-red-700 via-orange-600 to-amber-600">
        {/* Slide 1: Hot Game Chicken Road / Welcome */}
        <div
          className={`absolute inset-0 p-4 flex flex-col justify-between transition-opacity duration-700 ${
            activeBanner === 0 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-1.5 text-yellow-300 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>HOT CASINO JACKPOT • 100% RECHARGE BONUS</span>
          </div>

          <div className="relative z-10 max-w-[70%]">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
              WIN REAL CASH <br />
              <span className="text-yellow-300">EVERY 30 SECONDS</span>
            </h2>
            <p className="text-[11px] text-white/90 font-medium mt-0.5 line-clamp-1">
              Join 200,000+ players on Superstar Club!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/games/wingo"
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-950/40 flex items-center gap-1 active:scale-95 transition"
            >
              <span>Play Now</span>
              <ChevronRight className="w-3 h-3 stroke-[3]" />
            </Link>
          </div>

          <div className="absolute right-2 bottom-1 w-28 h-28 pointer-events-none flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-yellow-400/30 blur-xl absolute" />
            <span className="text-5xl filter drop-shadow-lg">🎰</span>
          </div>
        </div>

        {/* Slide 2: Win Go Color Prediction Special */}
        <div
          className={`absolute inset-0 p-4 flex flex-col justify-between bg-gradient-to-r from-rose-800 via-red-700 to-orange-700 transition-opacity duration-700 ${
            activeBanner === 1 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-1.5 text-yellow-300 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>WINGO 30S LOTTERY • 9X PAYOUT</span>
          </div>

          <div className="relative z-10 max-w-[70%]">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
              COLOR PREDICTION <br />
              <span className="text-yellow-300">RED • GREEN • VIOLET</span>
            </h2>
            <p className="text-[11px] text-white/90 font-medium mt-0.5">
              Live timer: <span className="font-mono font-bold text-yellow-300">{wingoTimer}s left</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/games/wingo"
              className="px-4 py-1.5 rounded-full bg-white text-rose-700 text-xs font-black shadow-lg flex items-center gap-1 active:scale-95 transition"
            >
              <span>Predict Color</span>
              <ChevronRight className="w-3 h-3 stroke-[3]" />
            </Link>
          </div>

          <div className="absolute right-2 bottom-1 w-28 h-28 pointer-events-none flex items-center justify-center">
            <span className="text-5xl filter drop-shadow-lg">🎲</span>
          </div>
        </div>

        {/* Slide 3: Aviator High Altitude */}
        <div
          className={`absolute inset-0 p-4 flex flex-col justify-between bg-gradient-to-r from-slate-900 via-rose-950 to-red-900 transition-opacity duration-700 ${
            activeBanner === 2 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AVIATOR CRASH • MULTIPLIER UP TO 100X+</span>
          </div>

          <div className="relative z-10 max-w-[70%]">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
              CASH OUT FAST <br />
              <span className="text-rose-400">BEFORE IT FLIES AWAY</span>
            </h2>
            <p className="text-[11px] text-white/90 font-medium mt-0.5">
              Current:{" "}
              <span className="font-mono font-bold text-emerald-400">
                {aviatorStatus === "FLYING" ? `${aviatorMultiplier.toFixed(2)}x` : aviatorStatus}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/games/aviator"
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-black shadow-lg flex items-center gap-1 active:scale-95 transition"
            >
              <span>Fly Jet</span>
              <ChevronRight className="w-3 h-3 stroke-[3]" />
            </Link>
          </div>

          <div className="absolute right-2 bottom-1 w-28 h-28 pointer-events-none flex items-center justify-center">
            <span className="text-5xl filter drop-shadow-lg">✈️</span>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => setActiveBanner(idx)}
              className={`h-1.5 rounded-full transition-all ${
                activeBanner === idx ? "w-5 bg-yellow-400" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. SPEAKER ANNOUNCEMENT MARQUEE TICKER (Exact match to Daman screenshot) */}
      <div className="bg-white rounded-xl px-3 py-2 shadow-sm border border-slate-200/80 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <div className="w-6 h-6 rounded-lg bg-[#ffe8e6] text-[#fe4f42] flex items-center justify-center shrink-0">
            <Megaphone className="w-3.5 h-3.5" />
          </div>
          <div className="text-[11px] text-slate-700 truncate font-medium">
            Attention ! Welcome to Superstar Club: 24/7 instant withdrawals, 100% Provably Fair algorithms & 1-tap UPI recharges!
          </div>
        </div>
        <button
          onClick={() => setIsNoticeOpen(true)}
          className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#fe5043] to-[#f2413b] text-white text-[10px] font-bold shrink-0 shadow-sm flex items-center gap-0.5 active:scale-95"
        >
          <Flame className="w-3 h-3" />
          <span>Detail</span>
        </button>
      </div>

      {/* 3. CASINO CATEGORIES GRID (2 Rows x 4 Cols - With Lock Indicators for Future Games) */}
      <div className="grid grid-cols-4 gap-2">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className={`p-2 rounded-2xl flex flex-col items-center justify-center relative transition-all ${
                isSelected
                  ? "bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-amber-400 shadow-md shadow-amber-500/10 scale-[1.02]"
                  : "bg-slate-900/80 border border-slate-800/80 hover:bg-slate-850 hover:border-slate-700"
              }`}
            >
              {!cat.active && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-black/80 border border-amber-400/60 flex items-center justify-center text-amber-400">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}

              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${cat.bg} flex items-center justify-center text-xl shadow-md`}
              >
                <span>{cat.icon}</span>
              </div>
              <span
                className={`text-[11px] font-black mt-1.5 tracking-tight ${
                  isSelected ? "text-amber-400" : "text-slate-300"
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. WALLET / GUEST REWARD CARD */}
      {!user ? (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-slate-900 border border-amber-500/40 rounded-2xl p-3.5 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                🎁 New Player Welcome Reward
              </span>
              <div className="text-base font-black text-white">
                Claim ₹100 Free Signup Bonus
              </div>
              <span className="text-[10px] text-slate-400">
                Register in 15 seconds & get ₹100 instant bonus cash!
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 font-mono">
              ₹100
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2.5">
            <Link
              href="/register"
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 py-2 rounded-xl text-xs font-black text-black shadow-md shadow-amber-500/20 active:scale-95 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Register Now</span>
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-200 active:scale-95 transition"
            >
              <span>Log In</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Real Cash (Withdrawable)</span>
              <div className="text-xl font-black text-amber-400 font-mono">
                ₹{user.wallet?.balance ? user.wallet.balance.toFixed(2) : "0.00"}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-300 font-semibold uppercase flex items-center justify-end gap-1">
                <span>Bonus Wallet</span>
                <span className="px-1 py-0.2 rounded text-[8px] bg-amber-500/20 text-amber-300 font-bold">1:2 ratio</span>
              </span>
              <div className="text-sm font-black text-amber-300 font-mono">
                ₹{user.wallet?.bonusBalance ? user.wallet.bonusBalance.toFixed(2) : "0.00"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2.5">
            <Link
              href="/wallet/recharge"
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 py-2 rounded-xl text-xs font-black text-black shadow-md shadow-green-950/40 active:scale-95 transition"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Recharge</span>
            </Link>
            <Link
              href="/wallet/withdraw"
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-200 active:scale-95 transition"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5 text-amber-400" />
              <span>Withdraw</span>
            </Link>
          </div>
        </div>
      )}

      {/* 5. PLATFORM RECOMMENDATION (Win Go & Aviator Unlocked, Others Locked) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-white">
            <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Platform recommendation</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            2 Games Active (Win Go & Aviator)
          </span>
        </div>

        {/* 3-Column Casino Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Card 1: Aviator (ACTIVE & UNLOCKED) */}
          <Link
            href="/games/aviator"
            className="flex flex-col bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl overflow-hidden shadow-lg group active:scale-98 transition relative"
          >
            <div className="relative aspect-square w-full">
              <AviatorLogoGraphic className="w-full h-full object-cover" />
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-rose-600/90 text-[8px] font-black text-white font-mono shadow">
                {aviatorStatus === "FLYING" ? `${aviatorMultiplier.toFixed(2)}x` : "LIVE"}
              </div>
            </div>
            <div className="p-1.5 text-center bg-slate-950/90">
              <span className="text-[10px] font-black text-white block uppercase tracking-wider group-hover:text-rose-400 transition">
                AVIATOR
              </span>
              <div className="mt-0.5 inline-block px-1.5 py-0.2 rounded-full bg-slate-900 text-[8px] font-bold text-rose-400 font-mono">
                RTP 96.43%
              </div>
            </div>
          </Link>

          {/* Card 2: Aviator VIP (ACTIVE & UNLOCKED) */}
          <Link
            href="/games/aviator"
            className="flex flex-col bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl overflow-hidden shadow-lg group active:scale-98 transition relative"
          >
            <div className="relative aspect-square w-full">
              <AviatorVipGraphic className="w-full h-full object-cover" />
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-[8px] font-black text-black font-mono shadow">
                PRO
              </div>
            </div>
            <div className="p-1.5 text-center bg-slate-950/90">
              <span className="text-[10px] font-black text-white block uppercase tracking-wider group-hover:text-amber-400 transition">
                AVIATOR PRO
              </span>
              <div className="mt-0.5 inline-block px-1.5 py-0.2 rounded-full bg-slate-900 text-[8px] font-bold text-amber-400 font-mono">
                RTP 97.82%
              </div>
            </div>
          </Link>

          {/* Card 3: Win Go Color Prediction (ACTIVE & UNLOCKED) */}
          <Link
            href="/games/wingo"
            className="flex flex-col bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-lg group active:scale-98 transition relative"
          >
            <div className="relative aspect-square w-full">
              <WingoLogoGraphic className="w-full h-full object-cover" />
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-red-600/90 text-[8px] font-black text-white font-mono shadow animate-pulse">
                {wingoTimer}s
              </div>
            </div>
            <div className="p-1.5 text-center bg-slate-950/90">
              <span className="text-[10px] font-black text-white block uppercase tracking-wider group-hover:text-amber-400 transition">
                WINGO
              </span>
              <div className="mt-0.5 inline-block px-1.5 py-0.2 rounded-full bg-slate-900 text-[8px] font-bold text-emerald-400 font-mono">
                RTP 96.9%
              </div>
            </div>
          </Link>

          {/* Card 4: Vortex (LOCKED) */}
          <div
            onClick={() => setLockedGameModal("Vortex Roulette")}
            className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg group cursor-pointer relative"
          >
            <div className="relative aspect-square w-full">
              <VortexGraphic className="w-full h-full object-cover opacity-40 grayscale-[30%]" />
              {/* Sleek Golden Lock Overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center mb-1 shadow-lg shadow-amber-500/30">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-[8px] font-black text-amber-300 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded-full border border-amber-500/40">
                  LOCKED
                </span>
              </div>
            </div>
            <div className="p-1.5 text-center bg-slate-950/90">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                VORTEX
              </span>
              <div className="mt-0.5 inline-block px-1.5 py-0.2 rounded-full bg-slate-900 text-[8px] font-bold text-slate-500 font-mono">
                VIP LEVEL 2
              </div>
            </div>
          </div>

          {/* Card 5: Chicken Road 2 (LOCKED) */}
          <div
            onClick={() => setLockedGameModal("Chicken Road 2")}
            className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg group cursor-pointer relative"
          >
            <div className="relative aspect-square w-full">
              <ChickenRoadGraphic className="w-full h-full object-cover opacity-40 grayscale-[30%]" />
              {/* Sleek Golden Lock Overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center mb-1 shadow-lg shadow-amber-500/30">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-[8px] font-black text-amber-300 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded-full border border-amber-500/40">
                  LOCKED
                </span>
              </div>
            </div>
            <div className="p-1.5 text-center bg-slate-950/90">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                CHICKEN ROAD
              </span>
              <div className="mt-0.5 inline-block px-1.5 py-0.2 rounded-full bg-slate-900 text-[8px] font-bold text-slate-500 font-mono">
                COMING SOON
              </div>
            </div>
          </div>

          {/* Card 6: Money Coming (LOCKED) */}
          <div
            onClick={() => setLockedGameModal("Money Coming Slots")}
            className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg group cursor-pointer relative"
          >
            <div className="relative aspect-square w-full">
              <MoneyComingGraphic className="w-full h-full object-cover opacity-40 grayscale-[30%]" />
              {/* Sleek Golden Lock Overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 text-amber-400 flex items-center justify-center mb-1 shadow-lg shadow-amber-500/30">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-[8px] font-black text-amber-300 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded-full border border-amber-500/40">
                  LOCKED
                </span>
              </div>
            </div>
            <div className="p-1.5 text-center bg-slate-950/90">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                MONEY COMING
              </span>
              <div className="mt-0.5 inline-block px-1.5 py-0.2 rounded-full bg-slate-900 text-[8px] font-bold text-slate-500 font-mono">
                COMING SOON
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. CONSTANTLY UPDATING LIVE BIG WINNERS TICKER FEED (Dynamic Player Motivation) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Winning Information (Live Feed)</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            Live Updates
          </span>
        </div>

        {/* Dynamic Winners List with Slide-in Highlight */}
        <div className="space-y-1.5 overflow-hidden">
          {liveWinners.map((w, i) => (
            <div
              key={w.id}
              className={`flex items-center justify-between text-xs px-2.5 py-2 rounded-xl border transition-all duration-300 ${
                i === 0
                  ? "bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-950 border-amber-500/40 shadow-sm shadow-amber-500/10 scale-[1.01]"
                  : "bg-slate-950/60 border-slate-850"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xs font-black shadow">
                  {w.avatar}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-white text-[11px] font-bold">{w.phone}</span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {w.vip}
                    </span>
                    {i === 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-500 text-white animate-pulse">
                        NEW WIN
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{w.game}</span>
                </div>
              </div>
              <span className={`font-mono font-black text-sm tracking-tight ${w.color}`}>
                +{w.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. FLOATING "ADD TO DESKTOP" PILL (Exact Daman Superstar Screenshot Match) */}
      <div className="fixed bottom-[4.25rem] left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <button
          onClick={() => {
            alert(
              "📲 Add Superstar to Desktop / Mobile Home Screen:\n\n" +
              "1. In your browser (Safari / Chrome), tap the Share / Menu icon (⋮)\n" +
              "2. Tap 'Add to Home Screen'\n" +
              "3. Enjoy 1-tap instant casino gaming anytime!"
            );
          }}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#ff7566] via-[#fe5043] to-[#f2413b] text-white text-xs font-black shadow-2xl shadow-red-500/50 border-2 border-white/70 flex items-center gap-1.5 active:scale-95 transition hover:scale-105 whitespace-nowrap"
        >
          <span className="text-sm">📱</span>
          <span>Add to Desktop</span>
        </button>
      </div>

      {/* 8. FLOATING CUSTOMER CARE SUPPORT WIDGET (Single Contact Point) */}
      <div className="fixed right-3 bottom-24 z-40 pointer-events-auto">
        <a
          href="https://t.me/Raayanhere"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#fe5043] via-[#ff6854] to-[#f2413b] shadow-xl shadow-red-500/40 border-2 border-white flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform"
          title="24/7 Live Customer Care (@Raayanhere)"
        >
          <Headphones className="w-5 h-5" />
        </a>
      </div>

      {/* 8. DETAIL ANNOUNCEMENT MODAL */}
      {isNoticeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Platform Announcement</h3>
                  <span className="text-[10px] text-slate-400">Superstar Club Official</span>
                </div>
              </div>
              <button
                onClick={() => setIsNoticeOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <p>
                Welcome to <strong>Superstar Club</strong>! We offer certified Provably Fair Win Go Color Prediction & Aviator crash gaming.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <div className="text-amber-400 font-bold">⚡ Key Platform Benefits:</div>
                <div>&bull; 24x7 Instant UPI Recharges (Google Pay, PhonePe, Paytm)</div>
                <div>&bull; Fast Bank Transfers & Instant Withdrawal Desk</div>
                <div>&bull; Refer & Earn ₹100 instant bonus cash on every friend signup!</div>
                <div>&bull; 100% genuine outcomes with verified random seeds.</div>
              </div>
            </div>

            <button
              onClick={() => setIsNoticeOpen(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-black shadow-lg"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* 9. LOCKED GAME MODAL (Clean Casino Lock Notice) */}
      {lockedGameModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative text-center animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setLockedGameModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-base font-black text-white">
              {lockedGameModal} is Locked
            </h3>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mt-0.5">
              Scheduled for VIP Phase Release
            </span>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              This game is currently locked. Right now, our two #1 official games are <strong>100% Active & Paying Out 24x7</strong>!
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/games/wingo"
                onClick={() => setLockedGameModal(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-xs shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 active:scale-98 transition"
              >
                <CircleDot className="w-4 h-4" />
                <span>Play Win Go 30s (Color Prediction)</span>
              </Link>

              <Link
                href="/games/aviator"
                onClick={() => setLockedGameModal(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-black text-xs flex items-center justify-center gap-2 active:scale-98 transition"
              >
                <Plane className="w-4 h-4 text-rose-500" />
                <span>Play Aviator (Crash Game)</span>
              </Link>
            </div>

            <button
              onClick={() => setLockedGameModal(null)}
              className="mt-3 text-[11px] text-slate-500 hover:text-slate-300 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 10. LUCKY SPIN WHEEL MODAL */}
      {isWheelOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-center relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsWheelOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white flex items-center justify-center gap-1.5">
              <span>🎡 Daily Lucky Spin Wheel</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Spin the wheel to win up to ₹500 instant wallet cash!
            </p>

            {/* Circular Spinning Wheel Graphic */}
            <div className="my-5 flex items-center justify-center relative">
              <div className="absolute -top-3 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-yellow-300 drop-shadow" />

              <div
                style={{
                  transform: `rotate(${wheelDegree}deg)`,
                  transition: spinningWheel ? "transform 3.8s cubic-bezier(0.15, 0.9, 0.25, 1)" : "none",
                }}
                className="w-56 h-56 rounded-full border-4 border-amber-300 shadow-2xl relative overflow-hidden flex items-center justify-center bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-yellow-200/40" />
                  <div className="w-full h-0.5 bg-yellow-200/40 rotate-45" />
                  <div className="w-full h-0.5 bg-yellow-200/40 rotate-90" />
                  <div className="w-full h-0.5 bg-yellow-200/40 rotate-[135deg]" />
                </div>

                <div className="w-20 h-20 rounded-full bg-slate-950 border-4 border-amber-300 flex flex-col items-center justify-center z-10 shadow-inner">
                  <span className="text-xs font-black text-amber-400">SUPER</span>
                  <span className="text-[9px] font-black text-white">SPIN</span>
                </div>
              </div>
            </div>

            {wheelPrize && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-black mb-3 animate-in zoom-in-90">
                🎉 Congratulations! You won {wheelPrize}!
              </div>
            )}

            <button
              onClick={handleSpinWheel}
              disabled={spinningWheel}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-black text-sm shadow-xl shadow-amber-500/30 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className={`w-4 h-4 ${spinningWheel ? "animate-spin" : ""}`} />
              <span>{spinningWheel ? "Spinning..." : "SPIN TO WIN ₹500"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
