import "dotenv/config";
import express from "express";
import cors from "cors";

import { login, logout, withUser } from "./auth";
import usersRouter from "./users.routes";
import cyclesRouter from "./cycles.routes";
import txnsRouter from "./txns.routes";
import exportRouter from "./export.routes";

const app = express();
app.set("trust proxy", 1);

// ✅ อนุญาตทุก origin (เพราะจะถูก proxy จาก Vercel อยู่แล้ว)
// ไม่ใช้คุกกี้ → ไม่ต้อง credentials
app.use(cors({ origin: true, credentials: false }));

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Auth (stateless, no cookie)
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
