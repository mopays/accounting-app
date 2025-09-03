import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// ถ้าใช้ Prisma: import { PrismaClient } from "@prisma/client";  // ต้องมี prisma generate ก่อน build
import { login, logout, withUser } from "./auth.js";
import usersRouter from "./users.routes.js";
import cyclesRouter from "./cycles.routes.js";
import txnsRouter from "./txns.routes.js";
import exportRouter from "./export.routes.js";

const app = express();

// อนุญาต origin ของ frontend บน Vercel ทั้งโปรดักชัน+พรีวิว
const allowedOrigins = [
  "https://accounting-app-inky.vercel.app",
  /\.vercel\.com$/ // อนุญาตโดเมน preview ของตัวเอง
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl / health
      if (allowedOrigins.some(o => (o instanceof RegExp ? o.test(origin) : o === origin))) {
        return cb(null, true);
      }
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
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
