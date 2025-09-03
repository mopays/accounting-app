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

// ไม่ใช้คุกกี้แล้ว → ไม่ต้อง credentials: true
app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Auth (stateless)
app.post("/auth/login", login);
app.post("/auth/logout", logout);

// Users (ตามที่มี)
app.use("/users", usersRouter);

// Protected (ยืนยันด้วย withUser ที่อ่าน username จาก header/query)
app.use("/cycles", withUser, cyclesRouter);
app.use("/txns", withUser, txnsRouter);
app.use("/reports", withUser, exportRouter);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`API running on http://0.0.0.0:${PORT}`));
