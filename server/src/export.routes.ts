import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();
const router = Router();

// ---- ใช้ string union เอง ----
const BUCKET = ["SAVINGS", "MONTHLY", "WANTS"] as const;
type Bucket = typeof BUCKET[number];
// --------------------------------

router.get("/export", async (req, res) => {
  const user = (req as any).user;
  const monthKey = String(req.query.monthKey || "");
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return res.status(400).json({ error: "invalid monthKey" });
  }

  const cycle = await prisma.budgetCycle.findFirst({
    where: { userId: user.id, monthKey },
  });
  if (!cycle) return res.status(404).json({ error: "cycle not found" });

  const txns = await prisma.transaction.findMany({
    where: { userId: user.id, cycleId: cycle.id },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  const wb = new ExcelJS.Workbook();
  const wsSum = wb.addWorksheet("Summary");

  const sumBy = (b: Bucket) =>
    txns.filter((t) => t.bucket === b).reduce((a, c) => a + Number(c.amount), 0);

  wsSum.addRow(["Month", monthKey]);
  wsSum.addRow([]);
  wsSum.addRow(["Bucket", "Allocated", "Used", "Remaining"]);

  const alloc = (b: Bucket) =>
    b === "SAVINGS" ? Number(cycle.allocSavings)
    : b === "MONTHLY" ? Number(cycle.allocMonthly)
    : Number(cycle.allocWants);

  BUCKET.forEach((b) => wsSum.addRow([b, alloc(b), sumBy(b), alloc(b) - sumBy(b)]));

  // แยก sheet ตาม bucket
  BUCKET.forEach((b) => {
    const ws = wb.addWorksheet(b);
    ws.addRow(["Date", "Note", "Amount"]);
    txns.filter((t) => t.bucket === b).forEach((t) => {
      ws.addRow([t.date.toISOString().slice(0, 10), t.note, Number(t.amount)]);
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="report-${monthKey}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

export default router;
