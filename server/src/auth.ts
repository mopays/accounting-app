import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Stateless login: accept { username } and ensure a user exists.
 * We do NOT set any cookies. Frontend should pass x-username header on every request.
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
  if (!user) {
    user = await prisma.user.create({ data: { username } });
  }
  return res.json({ id: user.id, username: user.username });
}

export async function logout(_req: Request, res: Response) {
  // nothing to do in stateless mode
  return res.json({ ok: true });
}

/**
 * Middleware: attach req.user by reading x-username header
 */
export async function withUser(req: Request, res: Response, next: NextFunction) {
  const username = (req.headers["x-username"] as string | undefined)?.trim();
  if (!username) {
    return res.status(401).json({ error: "x-username header required" });
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return res.status(401).json({ error: "user not found" });
  }
  (req as any).user = user;
  return next();
}
