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

// ไม่ใช้คุกกี้ → credentials:false
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

// Auth (no-cookie)
app.post("/auth/login", login);
app.post("/auth/logout", logout);

// Routes
app.use("/users", usersRouter);
app.use("/cycles", withUser, cyclesRouter);
app.use("/txns", withUser, txnsRouter);
app.use("/reports", withUser, exportRouter);

export default app;

// ✅ สำคัญ: ให้แอปรันจริงเมื่อไม่ใช่โหมดเทส
if (process.env.NODE_ENV !== "test") {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on http://0.0.0.0:${PORT}`);
  });
}
