import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import { createAdminRoutes } from "./routes/adminRoutes.js";
import { createGameRoutes } from "./routes/gameRoutes.js";
import { WinGoEngine } from "./games/wingo/wingoEngine.js";
import { AviatorEngine } from "./games/aviator/aviatorEngine.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.CORS_ORIGIN || "*",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local dev
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Initialize real-time game engines
const wingoEngine = new WinGoEngine(io);
const aviatorEngine = new AviatorEngine(io);

wingoEngine.start().then(() => {
  console.log("🎲 Win Go Color Prediction engine initialized");
});

aviatorEngine.start().then(() => {
  console.log("✈️ Aviator Crash engine initialized");
});

// Socket connection handling
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send initial state on connection
  socket.emit("wingo_init", {
    period: wingoEngine.currentPeriod,
    timeLeft: wingoEngine.timeLeft,
    isBettingOpen: wingoEngine.isBettingOpen,
  });

  socket.emit("aviator_init", {
    roundNumber: aviatorEngine.roundNumber,
    status: aviatorEngine.status,
    currentMultiplier: aviatorEngine.currentMultiplier,
    bettingCountdown: aviatorEngine.bettingCountdown,
  });

  socket.on("disconnect", () => {
    // console.log(`Client disconnected: ${socket.id}`);
  });
});

// Register API Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/games", createGameRoutes(wingoEngine, aviatorEngine));
app.use("/api/admin", createAdminRoutes(wingoEngine, aviatorEngine));

// Public Banking Operating Hours Check
app.get("/api/banking-hours", (_req, res) => {
  import("./services/bankingHoursService.js").then(({ getBankingHoursStatus }) => {
    res.json(getBankingHoursStatus());
  });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "v2.1-atomic-clock",
    timestamp: new Date().toISOString(),
    wingoPeriod: wingoEngine.currentPeriod,
    aviatorStatus: aviatorEngine.status,
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Betting App Backend & Game Server running on port ${PORT}`);
});
