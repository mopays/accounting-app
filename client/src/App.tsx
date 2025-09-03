import { useEffect, useState } from "react";
import { api, type Txn, type Bucket, type Cycle } from "./api";
import "./index.css";

const BUCKET_LABEL: Record<Bucket, string> = {
  SAVINGS: "เงินเก็บ",
  MONTHLY: "เงินใช้จ่ายรายเดือน",
  WANTS: "ของที่อยากได้",
};

function ymNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0"); // เดือนเริ่มที่ 0 → +1 แล้ว pad
  return `${y}-${m}`;
}

export default function App() {
  // auth
  const [username, setUsername] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [logged, setLogged] = useState(false);

  // cycle form (เก็บเป็น string เพื่อให้ว่างได้)
  const [monthKey, setMonthKey] = useState(ymNow());
  const [salary, setSalary] = useState<string>(""); // เดิมเป็น 0 → ""
  const [pct, setPct] = useState<{ SAVINGS: string; MONTHLY: string; WANTS: string }>({
    SAVINGS: "",
    MONTHLY: "",
    WANTS: "",
  });

  // data
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [remain, setRemain] = useState<{ [k in Bucket]?: number }>({});
  const [bucket, setBucket] = useState<Bucket>("MONTHLY");

  // txns
  const [txns, setTxns] = useState<Txn[]>([]);
  const [newTxn, setNewTxn] = useState<{
    date: string;
    note: string;
    amount: string; // เดิม number → string
  }>({
    date: new Date().toISOString().slice(0, 10),
    note: "",
    amount: "", // ว่างแทน 0
  });

  // edit txn
  const [editingTxnId, setEditingTxnId] = useState<number | null>(null);
  const [editTxn, setEditTxn] = useState<{
    date: string;
    note: string;
    amount: string; // เดิม number → string
    bucket: Bucket;
  }>({
    date: new Date().toISOString().slice(0, 10),
    note: "",
    amount: "",
    bucket: "MONTHLY",
  });

  // bootstrap / reload on deps
  useEffect(() => {
    if (!logged) return;
    (async () => {
      const cs = await api.listCycles();
      setCycles(cs);
      const c = cs.find((x) => x.monthKey === monthKey) ?? cs[0];
      if (c) {
        setCycleId(c.id);
        const s = await api.getSummary(c.id);
        setRemain(s.remain);
        const t = await api.listTxns(c.id, bucket);
        setTxns(t);
      } else {
        setCycleId(null);
        setRemain({});
        setTxns([]);
      }
    })();
  }, [logged, monthKey, bucket]);

  // ---------- auth ----------
  async function onRegister() {
    const name = registerName.trim();
    if (!name) return;
    await api.registerUser(name);
    await api.login(name);
    setUsername(name);
    setRegisterName("");
    setLogged(true);
  }
  async function onLogin() {
    const name = username.trim();
    if (!name) return;
    await api.login(name);
    setLogged(true);
  }
  async function onLogout() {
    await api.logout();
    setLogged(false);
    setCycles([]);
    setCycleId(null);
    setTxns([]);
    setRemain({});
  }

  // แปลง string → number อย่างปลอดภัย (ว่าง = 0)
  const toNum = (s: string) => (s.trim() === "" ? 0 : Number(s));

  // ---------- cycles ----------
  async function onUpsertCycle() {
    await api.upsertCycle({
      monthKey,
      salary: toNum(salary),
      pctSavings: toNum(pct.SAVINGS),
      pctMonthly: toNum(pct.MONTHLY),
      pctWants: toNum(pct.WANTS),
    });
    const cs = await api.listCycles();
    setCycles(cs);
    const c = cs.find((x) => x.monthKey === monthKey)!;
    setCycleId(c.id);
    const s = await api.getSummary(c.id);
    setRemain(s.remain);
    const t = await api.listTxns(c.id, bucket);
    setTxns(t);
  }

  async function onUpdateCycle() {
    if (!cycleId) return;
    await api.updateCycle(cycleId, {
      salary: toNum(salary),
      pctSavings: toNum(pct.SAVINGS),
      pctMonthly: toNum(pct.MONTHLY),
      pctWants: toNum(pct.WANTS),
    });
    const s = await api.getSummary(cycleId);
    setRemain(s.remain);
  }

  async function onDeleteCycle() {
    if (!cycleId) return;
    await api.deleteCycle(cycleId);
    const cs = await api.listCycles();
    setCycles(cs);
    const c = cs[0];
    if (c) {
      setCycleId(c.id);
      setMonthKey(c.monthKey);
      const s = await api.getSummary(c.id);
      setRemain(s.remain);
      const t = await api.listTxns(c.id, bucket);
      setTxns(t);
    } else {
      setCycleId(null);
      setRemain({});
      setTxns([]);
    }
  }

  // ---------- txns ----------
  async function onAddTxn() {
    if (!cycleId) return;
    await api.createTxn({
      cycleId,
      bucket,
      date: newTxn.date,
      note: newTxn.note,
      amount: toNum(newTxn.amount),
    });
    setNewTxn({ date: newTxn.date, note: "", amount: "" }); // คงเป็นค่าว่างต่อ
    const s = await api.getSummary(cycleId);
    setRemain(s.remain);
    const t = await api.listTxns(cycleId, bucket);
    setTxns(t);
  }

  function startEditTxn(t: Txn) {
    setEditingTxnId(t.id);
    setEditTxn({
      date: t.date.slice(0, 10),
      note: t.note,
      amount: String(t.amount ?? ""), // แปลงเป็น string เพื่อแก้ไขได้แบบว่าง
      bucket: t.bucket,
    });
  }

  async function saveEditTxn() {
    if (!cycleId || editingTxnId === null) return;
    await api.updateTxn(editingTxnId, {
      ...editTxn,
      amount: toNum(editTxn.amount),
    });
    setEditingTxnId(null);
    const s = await api.getSummary(cycleId);
    setRemain(s.remain);
    const t = await api.listTxns(cycleId, bucket);
    setTxns(t);
  }

  async function deleteTxn(id: number) {
    if (!cycleId) return;
    await api.deleteTxn(id);
    const s = await api.getSummary(cycleId);
    setRemain(s.remain);
    const t = await api.listTxns(cycleId, bucket);
    setTxns(t);
  }

  // ---------- UI ----------
  return (
    <div className="container">
      <div className="toolbar">
        <h1>บัญชีส่วนตัว</h1>
        {logged && (
          <button className="btn" onClick={onLogout}>
            Logout
          </button>
        )}
      </div>

      {!logged ? (
        <>
          {/* Register */}
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="field">
              <label className="label">ตั้ง username ใหม่</label>
              <input
                className="input"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="ชื่อที่จะสมัคร"
              />
            </div>
            <button className="btn primary" onClick={onRegister}>
              Register
            </button>
          </div>

          {/* Login */}
          <div className="row">
            <div className="field">
              <label className="label">เข้าสู่ระบบด้วย username</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ชื่อที่ login"
              />
            </div>
            <button className="btn" onClick={onLogin}>
              Login
            </button>
          </div>
        </>
      ) : (
        <>
          {/* รอบเดือน */}
          <section className="section">
            <h2>รอบเดือน</h2>

            <div className="row">
              <div className="field">
                <label className="label">เดือน (YYYY-MM)</label>
                <input
                  className="input"
                  value={monthKey}
                  onChange={(e) => setMonthKey(e.target.value)}
                  placeholder={ymNow()}
                />
              </div>

              <div className="field">
                <label className="label">เงินเดือน (บาท)</label>
                <input
                  className="input"
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)} // string
                  placeholder="เช่น 30000"
                />
              </div>

              <div className="field">
                <label className="label">% เงินเก็บ</label>
                <input
                  className="input"
                  type="number"
                  value={pct.SAVINGS}
                  onChange={(e) => setPct((p) => ({ ...p, SAVINGS: e.target.value }))}
                  placeholder="เช่น 30"
                />
              </div>

              <div className="field">
                <label className="label">% เงินใช้จ่ายรายเดือน</label>
                <input
                  className="input"
                  type="number"
                  value={pct.MONTHLY}
                  onChange={(e) => setPct((p) => ({ ...p, MONTHLY: e.target.value }))}
                  placeholder="เช่น 50"
                />
              </div>

              <div className="field">
                <label className="label">% ของที่อยากได้</label>
                <input
                  className="input"
                  type="number"
                  value={pct.WANTS}
                  onChange={(e) => setPct((p) => ({ ...p, WANTS: e.target.value }))}
                  placeholder="เช่น 20"
                />
              </div>

              <button className="btn primary" onClick={onUpsertCycle}>
                บันทึกรอบเดือน
              </button>
              <button className="btn" onClick={onUpdateCycle} disabled={!cycleId}>
                แก้ไขรอบเดือน
              </button>
              <button className="btn danger" onClick={onDeleteCycle} disabled={!cycleId}>
                ลบรอบเดือน
              </button>
            </div>

            {cycles.length > 0 && (
              <div className="row" style={{ marginTop: 10, alignItems: "center" }}>
                <span style={{ opacity: 0.8 }}>มีรอบเดือน:</span>
                {cycles.map((c) => (
                  <button
                    key={c.id}
                    className="btn ghost"
                    style={{ fontWeight: c.id === cycleId ? 700 : 400 }}
                    onClick={async () => {
                      setMonthKey(c.monthKey);
                      setCycleId(c.id);
                      const s = await api.getSummary(c.id);
                      setRemain(s.remain);
                      const t = await api.listTxns(c.id, bucket);
                      setTxns(t);
                    }}
                  >
                    {c.monthKey}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* การ์ดคงเหลือ */}
          <section className="grid-cards" style={{ marginTop: 12 }}>
            {(["SAVINGS", "MONTHLY", "WANTS"] as Bucket[]).map((b) => (
              <div key={b} className="card">
                <div style={{ opacity: 0.8 }}>{BUCKET_LABEL[b]}</div>
                <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8 }}>
                  {remain[b] === undefined ? "-" : (remain[b] ?? 0).toLocaleString()}
                </div>
                <button className="btn" style={{ marginTop: 8 }} onClick={() => setBucket(b)}>
                  ดูรายการ
                </button>
              </div>
            ))}
          </section>

          {/* รายการ */}
          <section className="section">
            <h2>รายการ: {BUCKET_LABEL[bucket]}</h2>

            {/* เพิ่มรายการ */}
            <div className="row">
              <div className="field">
                <label className="label">วันที่</label>
                <input
                  className="input"
                  type="date"
                  value={newTxn.date}
                  onChange={(e) => setNewTxn((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">รายละเอียด</label>
                <input
                  className="input"
                  placeholder="เช่น ค่าอาหาร"
                  value={newTxn.note}
                  onChange={(e) => setNewTxn((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="label">จำนวนเงิน (บาท)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="เช่น 120"
                  value={newTxn.amount}
                  onChange={(e) => setNewTxn((p) => ({ ...p, amount: e.target.value }))} // string
                />
              </div>
              <button className="btn primary" onClick={onAddTxn} disabled={!cycleId}>
                เพิ่มรายการ
              </button>
            </div>

            {/* ตารางรายการ */}
            <ul className="list">
              {txns.map((t) => (
                <li key={t.id} className="list-item">
                  {editingTxnId === t.id ? (
                    <>
                      <div className="row">
                        <div className="field">
                          <label className="label">วันที่</label>
                          <input
                            className="input"
                            type="date"
                            value={editTxn.date}
                            onChange={(e) => setEditTxn((p) => ({ ...p, date: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label className="label">ก้อนเงิน</label>
                          <select
                            className="select"
                            value={editTxn.bucket}
                            onChange={(e) =>
                              setEditTxn((p) => ({ ...p, bucket: e.target.value as Bucket }))
                            }
                          >
                            <option value="SAVINGS">เงินเก็บ</option>
                            <option value="MONTHLY">เงินใช้จ่ายรายเดือนรายเดือน</option>
                            <option value="WANTS">ของที่อยากได้</option>
                          </select>
                        </div>
                        <div className="field">
                          <label className="label">รายละเอียด</label>
                          <input
                            className="input"
                            value={editTxn.note}
                            onChange={(e) => setEditTxn((p) => ({ ...p, note: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label className="label">จำนวนเงิน (บาท)</label>
                          <input
                            className="input"
                            type="number"
                            value={editTxn.amount}
                            onChange={(e) =>
                              setEditTxn((p) => ({ ...p, amount: e.target.value }))
                            } // string
                          />
                        </div>
                      </div>
                      <div className="row" style={{ marginTop: 8 }}>
                        <button className="btn primary" onClick={saveEditTxn}>
                          บันทึก
                        </button>
                        <button className="btn" onClick={() => setEditingTxnId(null)}>
                          ยกเลิก
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>{new Date(t.date).toLocaleDateString()}</strong>
                        <span style={{ marginLeft: 8, opacity: 0.8 }}>({BUCKET_LABEL[t.bucket]})</span>
                        <div style={{ opacity: 0.9 }}>{t.note}</div>
                      </div>
                      <div className="row" style={{ alignItems: "center" }}>
                        <span>{t.amount.toLocaleString()}</span>
                        <button className="btn" onClick={() => startEditTxn(t)}>
                          แก้ไข
                        </button>
                        <button className="btn danger" onClick={() => deleteTxn(t.id)}>
                          ลบ
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
              {txns.length === 0 && <li style={{ opacity: 0.7 }}>ยังไม่มีรายการ</li>}
            </ul>
          </section>

          {/* Export */}
          <section style={{ marginTop: 12 }}>
            <a
              href={`${import.meta.env.VITE_API_URL}/reports/export?monthKey=${monthKey}`}
              target="_blank"
              rel="noreferrer"
            >
              <button className="btn">Export Excel ({monthKey})</button>
            </a>
          </section>
        </>
      )}
    </div>
  );
}
