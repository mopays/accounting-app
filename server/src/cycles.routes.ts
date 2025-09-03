import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

const createSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  salary: z.number().positive(),
  pctSavings: z.number().min(0).max(100),
  pctMonthly: z.number().min(0).max(100),
  pctWants: z.number().min(0).max(100),
}).refine(v => Math.round((v.pctSavings + v.pctMonthly + v.pctWants) * 100) / 100 === 100,
  { message: "เปอร์เซ็นต์ต้องรวมกัน = 100" }
);

// สร้าง/อัปเดตด้วย monthKey (เดิม)
router.post("/", async (req, res) => {
  const user = (req as any).user;
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { monthKey, salary, pctSavings, pctMonthly, pctWants } = parse.data;
  const allocSavings = salary * (pctSavings / 100);
  const allocMonthly = salary * (pctMonthly / 100);
  const allocWants   = salary * (pctWants   / 100);

  const cycle = await prisma.budgetCycle.upsert({
    where: { userId_monthKey: { userId: user.id, monthKey } },
    create: { userId: user.id, monthKey, salary, pctSavings, pctMonthly, pctWants, allocSavings, allocMonthly, allocWants },
    update: { salary, pctSavings, pctMonthly, pctWants, allocSavings, allocMonthly, allocWants },
  });

  res.json(cycle);
});

// แก้ไขรอบเดือนตาม id
const patchSchema = z.object({
  salary: z.number().positive().optional(),
  pctSavings: z.number().min(0).max(100).optional(),
  pctMonthly: z.number().min(0).max(100).optional(),
  pctWants: z.number().min(0).max(100).optional(),
});

router.patch("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid id" });

  const cycle = await prisma.budgetCycle.findFirst({ where: { id, userId: user.id } });
  if (!cycle) return res.status(404).json({ error: "cycle not found" });

  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const salary = parse.data.salary ?? Number(cycle.salary);
  const pctSavings = parse.data.pctSavings ?? Number(cycle.pctSavings);
  const pctMonthly = parse.data.pctMonthly ?? Number(cycle.pctMonthly);
  const pctWants   = parse.data.pctWants   ?? Number(cycle.pctWants);

  if (Math.round((pctSavings + pctMonthly + pctWants) * 100) / 100 !== 100) {
    return res.status(400).json({ error: "เปอร์เซ็นต์ต้องรวมกัน = 100" });
  }

  const updated = await prisma.budgetCycle.update({
    where: { id },
    data: {
      salary,
      pctSavings, pctMonthly, pctWants,
      allocSavings: salary * (pctSavings / 100),
      allocMonthly: salary * (pctMonthly / 100),
      allocWants:   salary * (pctWants   / 100),
    },
  });

  res.json(updated);
});

// ลบรอบเดือนตาม id (จะลบ transaction ของรอบนี้ด้วย)
router.delete("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid id" });

  const cycle = await prisma.budgetCycle.findFirst({ where: { id, userId: user.id } });
  if (!cycle) return res.status(404).json({ error: "cycle not found" });

  await prisma.transaction.deleteMany({ where: { userId: user.id, cycleId: id } });
  await prisma.budgetCycle.delete({ where: { id } });

  res.json({ ok: true });
});

// รายการรอบเดือน
router.get("/", async (req, res) => {
  const user = (req as any).user;
  const cycles = await prisma.budgetCycle.findMany({
    where: { userId: user.id },
    orderBy: [{ monthKey: "desc" }],
  });
  res.json(cycles);
});

export default router;
