import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

const BUCKET = ["SAVINGS", "MONTHLY", "WANTS"] as const;
const BucketEnum = z.enum(BUCKET);

// GET /txns?cycleId=&bucket=
router.get("/", async (req, res) => {
  const user = (req as any).user as { id: number };
  const cycleId = Number(req.query.cycleId);
  const bucket = String(req.query.bucket || "");
  if (!Number.isFinite(cycleId)) return res.status(400).json({ error: "cycleId required" });
  if (!BUCKET.includes(bucket as any)) return res.status(400).json({ error: "invalid bucket" });

  const txns = await prisma.transaction.findMany({
    where: { userId: user.id, cycleId, bucket: bucket as any },
    orderBy: { date: "asc" },
  });
  res.json(txns);
});

// POST /txns
router.post("/", async (req, res) => {
  const user = (req as any).user as { id: number };
  const schema = z.object({
    cycleId: z.number().int().positive(),
    bucket: BucketEnum,
    date: z.string(), // YYYY-MM-DD
    note: z.string().default(""),
    amount: z.number().finite(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.format() });

  const { cycleId, bucket, date, note, amount } = parse.data;
  const cycle = await prisma.budgetCycle.findFirst({ where: { id: cycleId, userId: user.id } });
  if (!cycle) return res.status(404).json({ error: "cycle not found" });

  const txn = await prisma.transaction.create({
    data: { userId: user.id, cycleId, bucket, date: new Date(date), note, amount },
  });
  res.json(txn);
});

// PATCH /txns/:id
router.patch("/:id", async (req, res) => {
  const user = (req as any).user as { id: number };
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

  const schema = z.object({
    date: z.string().optional(),
    note: z.string().optional(),
    amount: z.number().finite().optional(),
    bucket: BucketEnum.optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.format() });

  const found = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!found) return res.status(404).json({ error: "txn not found" });

  const data: any = { ...parse.data };
  if (data.date) data.date = new Date(data.date);

  const txn = await prisma.transaction.update({ where: { id }, data });
  res.json(txn);
});

// DELETE /txns/:id
router.delete("/:id", async (req, res) => {
  const user = (req as any).user as { id: number };
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

  const found = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!found) return res.status(404).json({ error: "txn not found" });

  await prisma.transaction.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
