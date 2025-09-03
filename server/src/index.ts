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

// proxy แล้ว origin จะเป็นโดเมน vercel ⇒ เปิดหลวม ๆ ไว้ก็ไม่เป็นไร
app.use(cors({ origin: true, credentials: false }));

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/auth/login", login);
app.post("/auth/logout", logout);

app.use("/users", usersRouter);

app.use("/cycles", withUser, cyclesRouter);
app.use("/txns", withUser, txnsRouter);
app.use("/reports", withUser, exportRouter);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`API running on http://0.0.0.0:${PORT}`));
