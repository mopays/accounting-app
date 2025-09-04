import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

const createSchema = z.object({
  username: z.string().min(1).max(64).regex(/^[\w.\-]+$/), // a-zA-Z0-9 _ . -
});

// POST /users  => สร้างผู้ใช้ใหม่ (409 ถ้ามีอยู่แล้ว)
router.post("/", async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { username } = parse.data;
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return res.status(409).json({ error: "username already exists" });

  const user = await prisma.user.create({ data: { username } });
  res.status(201).json(user);
});

// GET /users  => list users (ล่าสุดก่อน)
router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    take: 50,
    select: { id: true, username: true, createdAt: true },
  });
  res.json(users);
});

// DELETE /users/:id  => ลบผู้ใช้ (พร้อมข้อมูลที่เกี่ยวข้อง)
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid id" });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: "user not found" });

  // ลบข้อมูลที่เกี่ยวข้อง (ธุรกรรม + รอบเดือน) ก่อนลบ user
  await prisma.transaction.deleteMany({ where: { userId: id } });
  await prisma.budgetCycle.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  res.json({ ok: true });
});

export default router;
