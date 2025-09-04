import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// GET /reports/export?monthKey=YYYY-MM
// สร้าง CSV (เปิดด้วย Excel ได้)
router.get("/export", async (req, res) => {
  const user = (req as any).user as { id: number };
  const monthKey = String(req.query.monthKey || "");
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return res.status(400).json({ error: "invalid monthKey" });

  const cycle = await prisma.budgetCycle.findFirst({ where: { userId: user.id, monthKey } });
  if (!cycle) return res.status(404).json({ error: "cycle not found" });

  const txns = await prisma.transaction.findMany({
    where: { userId: user.id, cycleId: cycle.id },
    orderBy: { date: "asc" },
  });

  let csv = "date,bucket,note,amount\n";
  for (const t of txns) {
    const d = new Date(t.date);
    const iso = d.toISOString().slice(0, 10);
    const note = (t.note || "").replace(/"/g, '""');
    csv += `${iso},${t.bucket},"${note}",${t.amount}\n`;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="transactions_${monthKey}.csv"`);
  res.send(csv);
});

export default router;
