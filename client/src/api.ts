// frontend/src/api.ts

// const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";
const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";

const USERNAME_KEY = "app_username";
export const setUsername = (u: string) => localStorage.setItem(USERNAME_KEY, u);
export const getUsername = () => localStorage.getItem(USERNAME_KEY);

async function request(path: string, options: RequestInit = {}) {
  const username = getUsername();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (username) headers["x-username"] = username;

  // ✅ ย้ำว่า no-cookie: ไม่ใช้ credentials ระหว่าง CORS
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
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
  return res.json();
}

export type Cycle = {
  id: number;
  monthKey: string;
  salary: number;
  pctSavings: number;
  pctMonthly: number;
  pctWants: number;
  allocSavings: number;
  allocMonthly: number;
  allocWants: number;
};

export type Bucket = "SAVINGS" | "MONTHLY" | "WANTS";

export type Txn = {
  id: number;
  date: string;
  note: string;
  amount: number;
  bucket: Bucket;
};

export const api = {
  login: async (username: string) => {
    const r = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
    setUsername(username);
    return r;
  },
  logout: async () => {
    await request("/auth/logout", { method: "POST" });
    setUsername("");
  },

  registerUser: (username: string) =>
    request("/users", { method: "POST", body: JSON.stringify({ username }) }),
  listUsers: () => request("/users"),
  deleteUser: (id: number) => request(`/users/${id}`, { method: "DELETE" }),

  listCycles: (): Promise<Cycle[]> => request("/cycles"),
  upsertCycle: (body: {
    monthKey: string;
    salary: number;
    pctSavings: number;
    pctMonthly: number;
    pctWants: number;
  }) => request("/cycles", { method: "POST", body: JSON.stringify(body) }),
  updateCycle: (
    id: number,
    body: Partial<{
      salary: number;
      pctSavings: number;
      pctMonthly: number;
      pctWants: number;
    }>
  ) =>
    request(`/cycles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCycle: (id: number) => request(`/cycles/${id}`, { method: "DELETE" }),

  listTxns: (cycleId: number, bucket?: string): Promise<Txn[]> => {
    const username = getUsername();
    const url = new URL(`${API_URL}/txns`);
    url.searchParams.set("cycleId", String(cycleId));
    if (bucket) url.searchParams.set("bucket", bucket);
    if (username) url.searchParams.set("username", username);
    return fetch(url.toString(), {
      headers: username ? { "x-username": username } : {},
      credentials: "omit", // ✅ สำคัญ
    }).then(async (r) => {
      if (!r.ok) {
        let msg = `${r.status} ${r.statusText}`;
        try {
          const j = await r.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      return r.json();
    });
  },

  createTxn: (body: {
    cycleId: number;
    bucket: Bucket;
    date: string;
    note: string;
    amount: number;
  }) => request("/txns", { method: "POST", body: JSON.stringify(body) }),
  updateTxn: (
    id: number,
    body: Partial<{
      bucket: Bucket;
      date: string;
      note: string;
      amount: number;
    }>
  ) => request(`/txns/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTxn: (id: number) => request(`/txns/${id}`, { method: "DELETE" }),

  getSummary: (cycleId: number) => {
    const username = getUsername();
    const url = new URL(`${API_URL}/txns/summary`);
    url.searchParams.set("cycleId", String(cycleId));
    if (username) url.searchParams.set("username", username);
    return fetch(url.toString(), {
      headers: username ? { "x-username": username } : {},
      credentials: "omit", // ✅ สำคัญ
    }).then(async (r) => {
      if (!r.ok) {
        let msg = `${r.status} ${r.statusText}`;
        try {
          const j = await r.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      return r.json();
    });
  },
};
