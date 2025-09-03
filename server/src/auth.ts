import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COOKIE_NAME = "sid";

/** ตอนนี้ใช้ same-origin (ผ่าน Vercel proxy) ได้แล้ว
 *  ใช้ sameSite:lax จะเสถียรกว่า และไม่ต้องกำหนด domain
 */
const cookieOpts = {
  httpOnly: true,
  secure: true as const,    // Render เป็น HTTPS
  sameSite: "lax" as const, // ✅ first-party cookie
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 วัน
};

export async function login(req: Request, res: Response) {
  const { username } = (req.body ?? {}) as { username?: string };
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "username required" });
  }
  if (!/^[\w.\-]{1,64}$/.test(username)) {
    return res.status(400).json({ error: "invalid username" });
  }

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) user = await prisma.user.create({ data: { username } });

  res.cookie(COOKIE_NAME, String(user.id), cookieOpts);
  return res.json({ ok: true, user: { id: user.id, username: user.username } });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
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
