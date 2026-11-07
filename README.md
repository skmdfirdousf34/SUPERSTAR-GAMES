# Superstar Games Club (Daman Style Betting & Gaming Platform)

A full-stack, mobile-first real-money gaming and prediction platform inspired by platforms like **Daman Games / Daman Superstar**, featuring **Win Go (Color Prediction)** and **Aviator (Crash Game)** with real-time WebSockets, transactional double-entry wallet, recharge/withdrawal workflows, and an admin dashboard.

---

## 🚀 Features Overview

### 1. 🎲 Win Go (Color Prediction Game)
- **Real-time Synchronized 30-Second Rounds**: Server-driven state machine with WebSocket countdown.
- **25s Betting Phase + 5s Locked Calculation Phase**.
- **Betting Markets & Multipliers**:
  - **Colors**:
    - **Green** (1, 3, 7, 9) $\to$ **2x** payout (or 1.5x with violet on 5)
    - **Red** (2, 4, 6, 8) $\to$ **2x** payout (or 1.5x with violet on 0)
    - **Violet** (0, 5) $\to$ **4.5x** payout
  - **Numbers (0 to 9)** $\to$ **9x** payout
  - **Big / Small** (Big: 5–9, Small: 0–4) $\to$ **2x** payout
- **Automatic Winnings Settlement**: Instant wallet credit with 2% platform commission.
- **Parity History & Trend Chart**: Displays historical periods, winning numbers, color indicators, and size.

### 2. ✈️ Aviator (Crash Game)
- **Provably Fair Exponential Multiplier**: Generates crash point using SHA-256 cryptographic seeds.
- **High-Performance Canvas Radar Flight Animation**:
  - Real-time multiplier updates at ~80ms intervals via WebSockets.
  - Sleek red jet climbing along exponential curve with glowing jet-fire exhaust.
  - "Flew Away" crash explosion state.
- **Interactive Bet & Cashout Controls**:
  - Live multiplier and instant payout calculation.
  - **Manual Cashout**: Lock in profit before the plane flies away.
  - **Auto Cashout**: Set target multiplier (e.g. 2.00x) for automated cashout.
- **Live Players Table**: Displays all online players and real-time cashouts.

### 3. 💳 Wallet Ledger & Payment Workflow
- **Atomic Balance Deduction**: Strict database transactions (`$transaction`) preventing race conditions, double-spending, and negative balances.
- **Recharge (Deposit)**:
  - Preset amounts (₹100, ₹300, ₹500, ₹1000, ₹2000, ₹5000).
  - Dynamic QR code generation & UPI ID copy (`superstarpay@okhdfcbank`).
  - UTR / Reference number submission for verification.
- **Withdrawal**:
  - Direct payout to Bank Account (IFSC, Account Number) or UPI ID.
  - Instant balance lock upon withdrawal submission.
- **Financial History**: Full ledger of recharges, withdrawals, bets, and winnings.

### 4. 🛡️ Admin Management Dashboard
- **Live Business KPIs**:
  - Total registered players
  - Total recharges (deposits)
  - Total withdrawals
  - Net platform profit / house edge
  - Pending deposit & withdrawal counters
- **Deposit Approval**: Review payment UTR proof and click "Approve" to instantly credit player's wallet.
- **Withdrawal Approval**: Verify player's bank account details and mark paid or refund.
- **User Management**: View all users and adjust player balance manually.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons, Canvas API, Socket.IO Client, Canvas Confetti.
- **Backend**: Node.js, Express, Socket.IO, Prisma ORM, SQLite (local dev, zero-config) / PostgreSQL (production ready via `schema.prisma`), TypeScript, JWT, BCrypt.

---

## 🔑 Pre-Seeded Test Credentials

| Role | Phone | Password | Starting Balance |
| :--- | :--- | :--- | :--- |
| **Player (User)** | `9876543210` | `password123` | ₹5,000.00 |
| **Administrator** | `9999999999` | `adminpassword123` | ₹100,000.00 |

*Note: New registrations automatically receive a ₹100 welcome bonus.*

---

## 🏁 Quick Start Guide

### 1. Start Backend & Real-Time Engine
```bash
cd backend
npm install
npm run prisma:push
npm run prisma:seed
npm run dev
```
*Backend runs on: `http://localhost:5001`*

### 2. Start Frontend App
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on: `http://localhost:3000`*

---

## ⚖️ Legal & Regulatory Notice
Online betting, lottery, and real-money prediction games are heavily regulated. In many jurisdictions (e.g., India under the Public Gambling Act & State amendments, or parts of the US/EU), real-money operation requires valid gaming licenses (e.g., Curacao, Isle of Man, Malta MGA), mandatory KYC/AML compliance, and approved payment merchant gateways. This codebase is provided for software development and simulation architecture purposes.
