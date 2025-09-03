const API_URL = import.meta.env.VITE_API_URL as string;

export type Cycle = {
  id: number; monthKey: string; salary: number;
  pctSavings: number; pctMonthly: number; pctWants: number;
  allocSavings: number; allocMonthly: number; allocWants: number;
};
export type Bucket = "SAVINGS" | "MONTHLY" | "WANTS";
export type Txn = { id: number; date: string; note: string; amount: number; bucket: Bucket };

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include", // ✅ ส่งคุกกี้ทุกครั้ง
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    // ลองอ่านข้อความ error จาก backend
    let msg = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  // มีบาง endpoint (export) อาจเป็นไฟล์ ไม่ใช่ JSON — ตัวนี้ใช้กับ JSON เท่านั้น
  return res.json();
}

export const api = {
  // auth
  login: (username: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username }) }),
  logout: () => request("/auth/logout", { method: "POST" }),

  // users
  registerUser: (username: string) =>
    request("/users", { method: "POST", body: JSON.stringify({ username }) }),
  listUsers: () => request("/users"),
  deleteUser: (id: number) => request(`/users/${id}`, { method: "DELETE" }),

  // cycles
  listCycles: (): Promise<Cycle[]> => request("/cycles"),
  upsertCycle: (body: {
    monthKey: string; salary: number;
    pctSavings: number; pctMonthly: number; pctWants: number;
  }) =>
    request("/cycles", { method: "POST", body: JSON.stringify(body) }),
  updateCycle: (id: number, body: Partial<{
    salary: number; pctSavings: number; pctMonthly: number; pctWants: number;
  }>) =>
    request(`/cycles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCycle: (id: number) => request(`/cycles/${id}`, { method: "DELETE" }),

  // txns
  listTxns: (cycleId: number, bucket?: string): Promise<Txn[]> => {
    const url = new URL(`${API_URL}/txns`);
    url.searchParams.set("cycleId", String(cycleId));
    if (bucket) url.searchParams.set("bucket", bucket);
    return fetch(url.toString(), { credentials: "include" }).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    });
  },
  createTxn: (body: { cycleId: number; bucket: Bucket; date: string; note: string; amount: number; }) =>
    request("/txns", { method: "POST", body: JSON.stringify(body) }),
  updateTxn: (id: number, body: Partial<{ bucket: Bucket; date: string; note: string; amount: number; }>) =>
    request(`/txns/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTxn: (id: number) => request(`/txns/${id}`, { method: "DELETE" }),

  getSummary: (cycleId: number) => {
    const url = new URL(`${API_URL}/txns/summary`);
    url.searchParams.set("cycleId", String(cycleId));
    return fetch(url.toString(), { credentials: "include" }).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    });
  },
};
