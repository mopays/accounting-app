// src/api.ts

// Fallback เป็น "/api" เพื่อให้ใช้ร่วมกับ Vercel rewrites ได้
// ถ้าตั้ง VITE_API_URL ไว้ (เช่น https://accounting-app-khxi.onrender.com) ก็จะใช้ตามนั้น
export const API_URL: string = (import.meta.env.VITE_API_URL as string) || "/api";

const USERNAME_KEY = "app_username";
export const setUsername = (u: string) => localStorage.setItem(USERNAME_KEY, u);
export const getUsername = () => localStorage.getItem(USERNAME_KEY);
export const clearUsername = () => localStorage.removeItem(USERNAME_KEY);

// ---------- Types ----------
export type Bucket = "SAVINGS" | "MONTHLY" | "WANTS";

export type Cycle = {
  id: number;
  monthKey: string;            // YYYY-MM
  salary: number;
  pctSavings: number;
  pctMonthly: number;
  pctWants: number;
};

export type Summary = {
  remain: { [k in Bucket]?: number };
};

export type Txn = {
  id: number;
  cycleId: number;
  bucket: Bucket;
  date: string;                // ISO string
  note: string;
  amount: number;
};

// ---------- helper ----------
async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const username = getUsername();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  // ใช้ header แบบเบา ๆ แทนคุกกี้ เพื่อเลี่ยง CORS credentials
  if (username) headers["x-username"] = username;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    // สำคัญ: ไม่ส่งคุกกี้/credentials เพื่อหลบ CORS ที่หลังบ้านยังไม่เปิด allow-credentials
    credentials: "omit",
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }

  // บาง endpoint อาจไม่มี body (204)
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

// ---------- API ----------
export const api = {
  // auth (แบบง่าย ๆ ด้วย x-username)
  async registerUser(username: string) {
    return request("/users", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },
  async login(username: string) {
    setUsername(username);
    // ถ้าหลังบ้านมี endpoint login แยกไว้ ให้เรียกด้วย
    try {
      await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
    } catch {
      // ไม่มี endpoint ก็ไม่เป็นไร ใช้ x-username อย่างเดียว
    }
  },
  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      clearUsername();
    }
  },

  // cycles
  async listCycles(): Promise<Cycle[]> {
    return request("/cycles", { method: "GET" });
  },
  async upsertCycle(payload: {
    monthKey: string;
    salary: number;
    pctSavings: number;
    pctMonthly: number;
    pctWants: number;
  }) {
    // ใช้ POST /cycles เป็น upsert (ปรับตามหลังบ้านของคุณ)
    return request("/cycles", { method: "POST", body: JSON.stringify(payload) });
  },
  async updateCycle(id: number, payload: {
    salary: number;
    pctSavings: number;
    pctMonthly: number;
    pctWants: number;
  }) {
    return request(`/cycles/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async deleteCycle(id: number) {
    return request(`/cycles/${id}`, { method: "DELETE" });
  },
  async getSummary(cycleId: number): Promise<Summary> {
    return request(`/cycles/${cycleId}/summary`, { method: "GET" });
  },

  // txns
  async listTxns(cycleId: number, bucket: Bucket): Promise<Txn[]> {
    const params = new URLSearchParams({ cycleId: String(cycleId), bucket });
    return request(`/txns?${params.toString()}`, { method: "GET" });
  },
  async createTxn(payload: {
    cycleId: number;
    bucket: Bucket;
    date: string;   // YYYY-MM-DD
    note: string;
    amount: number;
  }) {
    return request("/txns", { method: "POST", body: JSON.stringify(payload) });
  },
  async updateTxn(id: number, payload: {
    date: string;   // YYYY-MM-DD
    note: string;
    amount: number;
    bucket: Bucket;
  }) {
    return request(`/txns/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async deleteTxn(id: number) {
    return request(`/txns/${id}`, { method: "DELETE" });
  },
};
