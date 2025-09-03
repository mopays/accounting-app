import { PrismaClient } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";

const prisma = new PrismaClient();

export async function login(req: Request, res: Response) {
  const username = String(req.body?.username || "").trim();
  if (!username) return res.status(400).json({ error: "username required" });

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) user = await prisma.user.create({ data: { username } });

  // demo cookie (ควรใช้ session/token จริงในโปรดักชัน)
  res.cookie("u", user.username, { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true, user });
}
export async function logout(_req: Request, res: Response){
    res.clearCookie("u")
    res.json({ok:true})
}

export async function withUser(req: Request, res: Response, next: NextFunction) {
  const u = String(req.cookies?.u || "");
  if (!u) return res.status(401).json({ error: "not logged in" });

  const user = await prisma.user.findUnique({ where: { username: u } });
  if (!user) return res.status(401).json({ error: "invalid user" });

  (req as any).user = user;
  next();
}
