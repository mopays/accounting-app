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

// ✅ อนุญาต origin ของ frontend (ห้ามมี / ท้ายโดเมน)
const allowedOrigins = [
  "https://accounting-app-inky.vercel.app", // production on Vercel
  /\.vercel\.app$/,                         // preview domains
];

// ✅ ตัวเลือก CORS — อนุญาต credentials และรองรับ preflight แน่นอน
const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // non-browser / same-origin
    const ok = allowedOrigins.some((o) =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    return ok ? callback(null, true) : callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // ✅ เผื่อ frontend ส่ง include มาก็ผ่าน
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-username"],
};

// ✅ จัดการ preflight ทุกเส้นทางก่อน
app.options("*", cors(corsOptions));

// ✅ ใช้ CORS เพียงครั้งเดียว
app.use(cors(corsOptions));

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

export default app;

if (process.env.NODE_ENV !== "test") {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on http://0.0.0.0:${PORT}`);
  });
}
