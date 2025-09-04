import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// POST /users  = register (idempotent)
router.post("/", async (req, res) => {
  const { username } = (req.body ?? {}) as { username?: string };
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "username required" });
  }
  if (!/^[\w.\-]{1,64}$/.test(username)) {
    return res.status(400).json({ error: "invalid username" });
  }
  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) user = await prisma.user.create({ data: { username } });
  return res.json({ id: user.id, username: user.username });
});

export default router;
