import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

const BUCKET = ["SAVINGS", "MONTHLY", "WANTS"] as const;
type Bucket = typeof BUCKET[number];
const BucketEnum = z.enum(BUCKET);

const createTxnSchema = z.object({
  cycleId: z.number().int().positive(),
  bucket: BucketEnum,
  date: z.string().or(z.date()),
  note: z.string().min(1),
  amount: z.number().positive(),
});

router.post("/", async (req, res) => {
  const user = (req as any).user;
  const parse = createTxnSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { cycleId, bucket, date, note, amount } = parse.data;

  const cycle = await prisma.budgetCycle.findFirst({ where: { id: cycleId, userId: user.id } });
  if (!cycle) return res.status(404).json({ error: "cycle not found" });

  const created = await prisma.transaction.create({
    data: { userId: user.id, cycleId, bucket, date: new Date(date as any), note, amount },
  });
  res.status(201).json(created);
});

// แก้ไขรายการ
const patchTxnSchema = z.object({
  bucket: BucketEnum.optional(),
  date: z.string().or(z.date()).optional(),
  note: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
});
router.patch("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid id" });
  const parse = patchTxnSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const txn = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!txn) return res.status(404).json({ error: "txn not found" });

  const data: any = { ...parse.data };
  if (data.date) data.date = new Date(data.date as any);

  const updated = await prisma.transaction.update({ where: { id }, data });
  res.json(updated);
});

// ลบรายการ
router.delete("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "invalid id" });

  const txn = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!txn) return res.status(404).json({ error: "txn not found" });

  await prisma.transaction.delete({ where: { id } });
  res.json({ ok: true });
});

// list
router.get("/", async (req, res) => {
  const user = (req as any).user;
  const cycleId = Number(req.query.cycleId);
  const bucketQ = req.query.bucket as string | undefined;
  const bucket = BUCKET.includes(bucketQ as any) ? (bucketQ as Bucket) : undefined;

  const where: any = { userId: user.id };
  if (cycleId) where.cycleId = cycleId;
  if (bucket) where.bucket = bucket;

  const txns = await prisma.transaction.findMany({ where, orderBy: [{ date: "desc" }, { id: "desc" }] });
  res.json(txns);
});

// summary
router.get("/summary", async (req, res) => {
  const user = (req as any).user;
  const cycleId = Number(req.query.cycleId);
  if (!cycleId) return res.status(400).json({ error: "cycleId required" });

  const cycle = await prisma.budgetCycle.findFirst({ where: { id: cycleId, userId: user.id } });
  if (!cycle) return res.status(404).json({ error: "cycle not found" });

  const used = await prisma.transaction.groupBy({
    by: ["bucket"],
    where: { userId: user.id, cycleId },
    _sum: { amount: true },
  });

  const sumBy = (b: Bucket) => Number(used.find((u) => u.bucket === b)?._sum.amount ?? 0);

  res.json({
    cycle,
    used: {
      SAVINGS: sumBy("SAVINGS"),
      MONTHLY: sumBy("MONTHLY"),
      WANTS:   sumBy("WANTS"),
    },
    remain: {
      SAVINGS: Number(cycle.allocSavings) - sumBy("SAVINGS"),
      MONTHLY: Number(cycle.allocMonthly) - sumBy("MONTHLY"),
      WANTS:   Number(cycle.allocWants)   - sumBy("WANTS"),
    },
  });
});

export default router;
