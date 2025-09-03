import cors from "cors";
import "dotenv/config";
import express from "express";

import { login, logout, withUser } from "./auth.js";
import cyclesRouter from "./cycles.routes.js";
import exportRouter from "./export.routes.js";
import txnsRouter from "./txns.routes.js";
import usersRouter from "./users.routes.js";

const app = express();
app.set("trust proxy", 1);

// ไม่ใช้คุกกี้ → credentials:false พอ
app.use(
  cors({
    origin: true,
    credentials: false,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-username"],
  })
);

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/auth/login", login);
app.post("/auth/logout", logout);

app.use("/users", usersRouter);
app.use("/cycles", withUser, cyclesRouter);
app.use("/txns", withUser, txnsRouter);
app.use("/reports", withUser, exportRouter);

export default app;
