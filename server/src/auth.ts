import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ชื่อคุกกี้
const COOKIE_NAME = "sid";

// ตัวเลือกคุกกี้ที่ให้ข้ามโดเมนได้ (Vercel <-> Render)
const cookieOpts = {
  httpOnly: true,
  secure: true as const,     // ต้อง https เท่านั้น
  sameSite: "none" as const, // ข้ามไซต์ได้
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 วัน
};

export async function login(req: Request, res: Response) {
  const { username } = (req.body ?? {}) as { username?: string };
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "username required" });
  }

  // อนุญาตแค่ a-zA-Z0-9 . _ -
  if (!/^[\w.\-]{1,64}$/.test(username)) {
    return res.status(400).json({ error: "invalid username" });
  }

  // หา/สร้างผู้ใช้
  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    user = await prisma.user.create({ data: { username } });
  }

  // เก็บ userId ลงคุกกี้ (ไม่ต้องมี session table ก็ได้)
  res.cookie(COOKIE_NAME, String(user.id), cookieOpts);
  return res.json({ ok: true, user: { id: user.id, username: user.username } });
}

export async function logout(_req: Request, res: Response) {
  // เคลียร์คุกกี้: ต้องระบุ options ให้ตรงกับตอนตั้ง
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
  return res.json({ ok: true });
}

export async function withUser(req: Request, res: Response, next: NextFunction) {
  const sid = req.cookies?.[COOKIE_NAME];
  if (!sid) return res.status(401).json({ error: "unauthorized" });

  const id = Number(sid);
  if (!Number.isFinite(id)) return res.status(401).json({ error: "invalid sid" });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(401).json({ error: "user not found" });

  (req as any).user = { id: user.id, username: user.username };
  return next();
}
