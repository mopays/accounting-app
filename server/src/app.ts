// backend/src/app.ts
import cookieParser from "cookie-parser";
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

// ✅ อนุญาต origin ของ frontend (อย่าใส่ / ท้ายโดเมน)
const allowedOrigins = [
  "https://accounting-app-inky.vercel.app", // production
  /\.vercel\.app$/,                          // preview domains
];

// ✅ ใช้ cors() แค่ครั้งเดียว และทำงานแบบ no-cookie
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser or same-origin
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
    credentials: false, // ✅ no-cookie mode ให้สอดคล้องกับ frontend
  })
);

app.use(express.json());
app.use(cookieParser());

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

if (process.env.NODE_ENV !== "test") {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on http://0.0.0.0:${PORT}`);
  });
}
