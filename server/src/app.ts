import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";

// ถ้าใช้ Prisma: import { PrismaClient } from "@prisma/client";  // ต้องมี prisma generate ก่อน build
import { login, logout, withUser } from "./auth.js";
import cyclesRouter from "./cycles.routes.js";
import exportRouter from "./export.routes.js";
import txnsRouter from "./txns.routes.js";
import usersRouter from "./users.routes.js";

const app = express();

// อนุญาต origin ของ frontend บน Vercel ทั้งโปรดักชัน+พรีวิว
const allowedOrigins = [
  "https://accounting-app-inky.vercel.app/", // client production
  /\.vercel\.app$/, // allow preview domains ของ Vercel
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.some((o) => o instanceof RegExp && o.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-username"],
    credentials: false, // ❗ no-cookie mode
  })
);

app.use(
  cors({
    origin: true,
    credentials: false,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-username"],
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Auth
app.post("/auth/login", login);
app.post("/auth/logout", logout);

// Users
app.use("/users", usersRouter);

// Protected
app.use("/cycles", withUser, cyclesRouter);
app.use("/txns", withUser, txnsRouter);
app.use("/reports", withUser, exportRouter);

export default app; // <<< สำคัญมาก
