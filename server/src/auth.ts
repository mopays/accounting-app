import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Login แบบไม่ใช้คุกกี้:
 *  รับ { username } → ถ้าไม่มีใน DB จะสร้างใหม่ แล้วคืนข้อมูล user กลับ
 *  ไม่ตั้ง cookie ใดๆ
 */
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

  // ไม่ตั้ง cookie — ให้ client เก็บ username เอง แล้วแนบมากับทุก request
  return res.json({ ok: true, user: { id: user.id, username: user.username } });
}

/** Logout แบบไม่ใช้คุกกี้: แค่ตอบ ok */
export async function logout(_req: Request, res: Response) {
  return res.json({ ok: true });
}

/** withUser: อ่าน username จาก header x-username หรือ query ?username=... */
export async function withUser(req: Request, res: Response, next: NextFunction) {
  let username = (req.headers["x-username"] as string | undefined)?.trim();
  if (!username) {
    const q = req.query.username;
    if (typeof q === "string") username = q.trim();
  }
  if (!username) return res.status(401).json({ error: "username missing" });
  if (!/^[\w.\-]{1,64}$/.test(username)) {
    return res.status(400).json({ error: "invalid username" });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(404).json({ error: "user not found" });

  (req as any).user = { id: user.id, username: user.username };
  next();
}
