"use client";

import React from "react";

/**
 * WingoLogoGraphic - Exact Daman Style WINGO Casino Card
 * Features: Glossy red/orange gradient, 3D lottery balls ('5', '0', '1'),
 * flying gold coins, '$' jackpot medallion, and bold glowing "WINGO" typography.
 */
export function WingoLogoGraphic({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        {/* Background gradient */}
        <radialGradient id="wingoBgGlow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff5242" />
          <stop offset="55%" stopColor="#e52920" />
          <stop offset="100%" stopColor="#99110b" />
        </radialGradient>
        {/* Gold coin gradient */}
        <radialGradient id="goldCoin" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff385" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        {/* Red ball gradient */}
        <radialGradient id="redBall" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ff8a80" />
          <stop offset="45%" stopColor="#f44336" />
          <stop offset="100%" stopColor="#b71c1c" />
        </radialGradient>
        {/* Purple ball gradient */}
        <radialGradient id="purpleBall" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#e1bee7" />
          <stop offset="45%" stopColor="#9c27b0" />
          <stop offset="100%" stopColor="#4a148c" />
        </radialGradient>
        {/* Green ball gradient */}
        <radialGradient id="greenBall" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="45%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
        <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
        </filter>
        <filter id="glowGold" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Card Base */}
      <rect width="280" height="280" rx="24" fill="url(#wingoBgGlow)" />

      {/* Burst Rays */}
      <path d="M140 140 L0 0 L40 0 Z" fill="#fff" opacity="0.07" />
      <path d="M140 140 L280 0 L240 0 Z" fill="#fff" opacity="0.07" />
      <path d="M140 140 L280 100 L280 140 Z" fill="#fff" opacity="0.07" />
      <path d="M140 140 L0 100 L0 140 Z" fill="#fff" opacity="0.07" />
      <path d="M140 140 L80 280 L120 280 Z" fill="#fff" opacity="0.07" />
      <path d="M140 140 L160 280 L200 280 Z" fill="#fff" opacity="0.07" />

      {/* Top Left: Small Red Ball '5' */}
      <g filter="url(#shadowFilter)">
        <circle cx="56" cy="60" r="22" fill="url(#redBall)" />
        <ellipse cx="48" cy="52" rx="6" ry="3.5" fill="#fff" opacity="0.6" transform="rotate(-25 48 52)" />
        <text x="56" y="67" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="900" fontFamily="sans-serif">5</text>
      </g>

      {/* Top Right: Small Purple Ball '9' */}
      <g filter="url(#shadowFilter)">
        <circle cx="224" cy="70" r="19" fill="url(#purpleBall)" />
        <ellipse cx="218" cy="63" rx="5" ry="3" fill="#fff" opacity="0.6" transform="rotate(-25 218 63)" />
        <text x="224" y="77" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="900" fontFamily="sans-serif">9</text>
      </g>

      {/* Top Right Floating Gold Coin */}
      <g filter="url(#shadowFilter)" transform="rotate(15 240 115)">
        <circle cx="240" cy="115" r="13" fill="url(#goldCoin)" stroke="#fef08a" strokeWidth="2" />
        <text x="240" y="120" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="900" fontFamily="sans-serif">★</text>
      </g>

      {/* Left Floating Green Ball '1' */}
      <g filter="url(#shadowFilter)">
        <circle cx="38" cy="125" r="15" fill="url(#greenBall)" />
        <ellipse cx="33" cy="119" rx="4.5" ry="2.5" fill="#fff" opacity="0.6" transform="rotate(-25 33 119)" />
        <text x="38" y="131" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900" fontFamily="sans-serif">1</text>
      </g>

      {/* Center Big Gold Coin / Jackpot Symbol */}
      <g filter="url(#shadowFilter)">
        <circle cx="140" cy="108" r="50" fill="url(#goldCoin)" stroke="#fef3c7" strokeWidth="3.5" />
        <circle cx="140" cy="108" r="41" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="5 3" />
        <circle cx="140" cy="108" r="37" fill="url(#goldCoin)" />
        <path d="M110 87 Q140 72 170 87 A37 37 0 0 0 110 87" fill="#fff" opacity="0.35" />
        <text x="140" y="124" textAnchor="middle" fill="#78350f" fontSize="44" fontWeight="900" fontFamily="sans-serif" filter="drop-shadow(0 2px 2px rgba(255,255,255,0.4))">$</text>
      </g>

      {/* Flying Gold Sparks */}
      <circle cx="78" cy="155" r="3" fill="#fef08a" filter="url(#glowGold)" />
      <circle cx="204" cy="155" r="4" fill="#fef08a" filter="url(#glowGold)" />
      <circle cx="196" cy="40" r="2.5" fill="#fef08a" />
      <circle cx="86" cy="32" r="3" fill="#fef08a" />

      {/* WINGO Bold Title Banner with Shadow */}
      <g filter="url(#shadowFilter)">
        <text x="140" y="210" textAnchor="middle" fill="#000" opacity="0.35" fontSize="40" fontWeight="900" letterSpacing="3" fontFamily="sans-serif">
          WINGO
        </text>
        <text x="140" y="207" textAnchor="middle" fill="#ffffff" fontSize="40" fontWeight="900" letterSpacing="3" fontFamily="sans-serif">
          WINGO
        </text>
      </g>

      {/* Subtitle / Lottery Tag */}
      <text x="140" y="234" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="800" letterSpacing="4" fontFamily="sans-serif">
        COLOR LOTTERY
      </text>
    </svg>
  );
}

/**
 * AviatorLogoGraphic - Exact Daman Style AVIATOR Casino Card (Dark Edition)
 * Features: Obsidian cockpit carbon background, glowing red radar grid,
 * ascending red supersonic jet with propeller, and cursive red neon "Aviator" script.
 */
export function AviatorLogoGraphic({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="aviatorDarkBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1d27" />
          <stop offset="50%" stopColor="#11141c" />
          <stop offset="100%" stopColor="#080a0f" />
        </linearGradient>
        <radialGradient id="redJetGlow" cx="60%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#ff1744" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#b71c1c" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="redJetFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5252" />
          <stop offset="50%" stopColor="#e53935" />
          <stop offset="100%" stopColor="#b71c1c" />
        </linearGradient>
        <filter id="aviatorGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#ff1744" floodOpacity="0.75" />
        </filter>
        <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#ff1744" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Dark Card Base */}
      <rect width="280" height="280" rx="24" fill="url(#aviatorDarkBg)" />

      {/* Background Red Glow */}
      <circle cx="160" cy="100" r="105" fill="url(#redJetGlow)" />

      {/* Flight Radar Curve Line */}
      <path
        d="M20 210 C 60 205, 120 190, 160 140 C 195 90, 230 60, 255 45"
        fill="none"
        stroke="#ff1744"
        strokeWidth="2.5"
        strokeDasharray="6 4"
        opacity="0.6"
      />

      {/* Supersonic Fighter Prop Jet Climbing */}
      <g transform="translate(132, 50) rotate(-18) scale(1.15)" filter="url(#aviatorGlow)">
        {/* Wing Left */}
        <path d="M22 35 L-12 52 L-4 56 L24 42 Z" fill="#c62828" />
        {/* Main Jet Body */}
        <path
          d="M60 28 C60 28, 48 20, 26 22 L-8 27 C-18 29, -24 33, -26 36 C-24 39, -18 43, -8 45 L26 50 C48 52, 60 44, 60 44 C65 40, 68 36, 68 36 C68 36, 65 32, 60 28 Z"
          fill="url(#redJetFill)"
        />
        {/* Cockpit Canopy */}
        <path d="M18 25 Q32 24 40 32 Q26 36 14 33 Z" fill="#ffffff" opacity="0.85" />
        {/* Wing Right */}
        <path d="M28 32 L-2 8 L8 6 L36 26 Z" fill="#ff5252" />
        {/* Tail Fin */}
        <path d="M-18 36 L-34 20 L-30 18 L-10 33 Z" fill="#d32f2f" />
        {/* Propeller Blade */}
        <ellipse cx="67" cy="36" rx="2" ry="17" fill="#ffeb3b" opacity="0.8" />
      </g>

      {/* Iconic Cursive "Aviator" Script Text */}
      <g filter="url(#textGlow)">
        <text
          x="140"
          y="178"
          textAnchor="middle"
          fill="#ff1744"
          fontSize="46"
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="Brush Script MT, cursive, sans-serif"
          letterSpacing="1"
        >
          Aviator
        </text>
      </g>

      {/* Uppercase Clean Subtitle */}
      <text
        x="140"
        y="210"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="14"
        fontWeight="900"
        letterSpacing="6"
        fontFamily="sans-serif"
      >
        AVIATOR
      </text>

      {/* Crash Game pill */}
      <g transform="translate(95, 226)">
        <rect width="90" height="22" rx="11" fill="#261016" stroke="#ff1744" strokeWidth="1.2" />
        <text
          x="45"
          y="15"
          textAnchor="middle"
          fill="#ff5252"
          fontSize="10"
          fontWeight="800"
          fontFamily="sans-serif"
          letterSpacing="1"
        >
          CRASH GAME
        </text>
      </g>
    </svg>
  );
}

/**
 * AviatorVipGraphic - Red Edition Aviator (from user screenshot Card 2)
 */
export function AviatorVipGraphic({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="aviatorRedBg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#991b1b" />
          <stop offset="60%" stopColor="#450a0a" />
          <stop offset="100%" stopColor="#1c0505" />
        </radialGradient>
        <filter id="vipGlow">
          <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#f43f5e" floodOpacity="0.8" />
        </filter>
      </defs>

      <rect width="280" height="280" rx="24" fill="url(#aviatorRedBg)" />

      {/* Red Jet silhouette climbing */}
      <g transform="translate(136, 60) rotate(-22) scale(1.1)" filter="url(#vipGlow)">
        <path d="M22 35 L-12 52 L-4 56 L24 42 Z" fill="#fda4af" />
        <path
          d="M60 28 C60 28, 48 20, 26 22 L-8 27 C-18 29, -24 33, -26 36 C-24 39, -18 43, -8 45 L26 50 C48 52, 60 44, 60 44 Z"
          fill="#f43f5e"
        />
        <path d="M28 32 L-2 8 L8 6 L36 26 Z" fill="#ffe4e6" />
        <ellipse cx="65" cy="36" rx="2" ry="16" fill="#fef08a" />
      </g>

      <text
        x="140"
        y="178"
        textAnchor="middle"
        fill="#f43f5e"
        fontSize="44"
        fontWeight="bold"
        fontStyle="italic"
        fontFamily="Brush Script MT, cursive, sans-serif"
        filter="drop-shadow(0 2px 4px rgba(244,63,94,0.7))"
      >
        Aviator
      </text>

      <text
        x="140"
        y="210"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="14"
        fontWeight="900"
        letterSpacing="6"
        fontFamily="sans-serif"
      >
        AVIATOR PRO
      </text>

      <g transform="translate(95, 226)">
        <rect width="90" height="22" rx="11" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
        <text
          x="45"
          y="15"
          textAnchor="middle"
          fill="#fda4af"
          fontSize="10"
          fontWeight="800"
          fontFamily="sans-serif"
        >
          VIP TURBO
        </text>
      </g>
    </svg>
  );
}

/**
 * ChickenRoadGraphic - Hot Game Card from screenshot
 */
export function ChickenRoadGraphic({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="chickenBg" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>
      <rect width="280" height="280" rx="24" fill="url(#chickenBg)" />
      {/* Cartoon Road tiles */}
      <path d="M40 160 L140 100 L240 160 L140 220 Z" fill="#92400e" opacity="0.6" />
      <path d="M70 160 L140 115 L210 160 L140 205 Z" fill="#fbbf24" opacity="0.8" />
      {/* Golden Egg & Crown */}
      <ellipse cx="140" cy="100" rx="34" ry="42" fill="#fef08a" stroke="#f59e0b" strokeWidth="3" />
      <path d="M125 65 L132 78 L140 68 L148 78 L155 65 L153 82 L127 82 Z" fill="#ef4444" />
      <text x="140" y="195" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" fontFamily="sans-serif" filter="drop-shadow(0 2px 4px #000)">
        CHICKEN ROAD
      </text>
      <text x="140" y="222" textAnchor="middle" fill="#fef3c7" fontSize="11" fontWeight="800" letterSpacing="2" fontFamily="sans-serif">
        HOT CASINO ARCADE
      </text>
    </svg>
  );
}

/**
 * MoneyComingGraphic - Green Cash Stacks Card from screenshot
 */
export function MoneyComingGraphic({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="moneyBg" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
      </defs>
      <rect width="280" height="280" rx="24" fill="url(#moneyBg)" />
      {/* Dollar Bills Stack */}
      <rect x="70" y="70" width="140" height="75" rx="8" fill="#a7f3d0" stroke="#059669" strokeWidth="3" transform="rotate(-8 140 100)" />
      <rect x="70" y="70" width="140" height="75" rx="8" fill="#d1fae5" stroke="#059669" strokeWidth="3" />
      <circle cx="140" cy="107" r="22" fill="#059669" opacity="0.3" />
      <text x="140" y="117" textAnchor="middle" fill="#065f46" fontSize="28" fontWeight="900" fontFamily="sans-serif">₹</text>
      <text x="140" y="195" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" fontFamily="sans-serif" filter="drop-shadow(0 2px 4px #000)">
        MONEY COMING
      </text>
      <text x="140" y="222" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="800" letterSpacing="2" fontFamily="sans-serif">
        CRAZY MULTIPLIER
      </text>
    </svg>
  );
}

/**
 * VortexGraphic - Cosmic Neon Roulette from screenshot
 */
export function VortexGraphic({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="vortexBg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>
      <rect width="280" height="280" rx="24" fill="url(#vortexBg)" />
      {/* Neon Spiral */}
      <circle cx="140" cy="105" r="50" fill="none" stroke="#60a5fa" strokeWidth="6" strokeDasharray="15 8" opacity="0.7" />
      <circle cx="140" cy="105" r="35" fill="none" stroke="#f43f5e" strokeWidth="6" strokeDasharray="12 6" opacity="0.8" />
      <circle cx="140" cy="105" r="20" fill="none" stroke="#fbbf24" strokeWidth="5" opacity="0.9" />
      <circle cx="140" cy="105" r="8" fill="#ffffff" />
      <text x="140" y="195" textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="900" fontFamily="sans-serif" filter="drop-shadow(0 2px 4px #000)">
        VORTEX
      </text>
      <text x="140" y="222" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="800" letterSpacing="2" fontFamily="sans-serif">
        NEON WHEEL
      </text>
    </svg>
  );
}
