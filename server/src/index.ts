import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { login, logout, withUser } from "./auth";
import usersRouter from "./users.routes";
import cyclesRouter from "./cycles.routes";
import txnsRouter from "./txns.routes";
import exportRouter from "./export.routes";

const app = express();

/** สำคัญ: อยู่หลัง reverse proxy (Render/Heroku/…)
 *  เพื่อให้ cookie ที่ตั้งเป็น { secure: true } ทำงานถูกต้อง
 */
app.set("trust proxy", 1);

/** อนุญาตโดเมนหน้าเว็บ (Vercel) ส่งคุกกี้ข้ามโดเมน */
const ALLOWED_ORIGINS = [
  "https://accounting-app-inky.vercel.app", // Frontend ของคุณบน Vercel
];
app.use(
  cors({
    origin(origin, cb) {
      // อนุญาตเครื่องมือ dev ที่ไม่มี origin (เช่น curl / health)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
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

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`API running on http://0.0.0.0:${PORT}`));
