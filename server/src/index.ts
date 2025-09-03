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

/** อยู่หลัง reverse proxy (Render) เพื่อให้ secure cookies ทำงานถูกต้อง */
app.set("trust proxy", 1);

/**
 * เมื่อ client เรียกผ่าน Vercel rewrite เป็นเสมือน same-origin แล้ว
 * จริง ๆ ไม่จำเป็นต้อง CORS แต่คงไว้แบบ permissive ก็ไม่เป็นไร
 * (จะถูกเรียกจาก Vercel proxy เป็นหลัก)
 */
app.use(cors({
  origin: true,
  credentials: true,
}));

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
