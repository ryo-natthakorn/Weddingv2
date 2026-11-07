/* Lucky-draw state: which ticket numbers exist, which are out of the drum,
   who has won what. Everything lives in localStorage on the iPad so a reload,
   a locked screen or a closed tab never loses a result mid-reception. */

export type Prize = {
  id: string;
  name: string; // Thai — the line the MC reads out
  sub: string; // English subtitle
  winner: string | null;
};

export type LogEntry = {
  n: string;
  prize: string;
  at: number;
  result: "won" | "void" | "cancel" | "cleared";
};

/* A number that has been drawn but not yet confirmed. It is saved the moment
   the drum starts turning, so reloading the page during the spin lands on the
   same number instead of offering a second try. */
export type Pending = { n: string; prizeId: string };

export type DrawState = {
  spec: string;
  excluded: string[]; // tickets still on the board — never handed out
  voided: string[]; // drawn, nobody came up — out of the drum for good
  prizes: Prize[];
  activeId: string;
  pending: Pending | null;
  sound: boolean;
  log: LogEntry[];
};

/* Read off the printed tickets (999849, 999949, 999998, 999999 …): 200
   tickets counting down from 999999. Editable in Settings if the print run
   differs. */
export const DEFAULT_SPEC = "999800-999999";

export const DEFAULT_PRIZES: Prize[] = [
  { id: "bride", name: "รางวัลบ้านเจ้าสาว", sub: "Bride's family prize", winner: null },
  { id: "groom", name: "รางวัลบ้านเจ้าบ่าว", sub: "Groom's family prize", winner: null },
];

const STORAGE_KEY = "pn-lucky-draw-v1";

export function defaultState(): DrawState {
  return {
    spec: DEFAULT_SPEC,
    excluded: [],
    voided: [],
    prizes: DEFAULT_PRIZES.map((p) => ({ ...p })),
    activeId: DEFAULT_PRIZES[0].id,
    pending: null,
    sound: true,
    log: [],
  };
}

const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

export function loadState(): DrawState {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    const prizes: Prize[] = Array.isArray(s.prizes)
      ? s.prizes
          .filter((p: any) => p && typeof p.id === "string" && typeof p.name === "string")
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            sub: typeof p.sub === "string" ? p.sub : "",
            winner: typeof p.winner === "string" ? p.winner : null,
          }))
      : base.prizes;
    if (!prizes.length) prizes.push(...base.prizes);
    const pending =
      s.pending && typeof s.pending.n === "string" && prizes.some((p) => p.id === s.pending.prizeId)
        ? { n: s.pending.n, prizeId: s.pending.prizeId }
        : null;
    return {
      spec: typeof s.spec === "string" ? s.spec : base.spec,
      excluded: isStrArr(s.excluded) ? s.excluded : [],
      voided: isStrArr(s.voided) ? s.voided : [],
      prizes,
      activeId: prizes.some((p) => p.id === s.activeId) ? s.activeId : prizes[0].id,
      pending,
      sound: typeof s.sound === "boolean" ? s.sound : true,
      log: Array.isArray(s.log) ? s.log.slice(-500) : [],
    };
  } catch {
    return base;
  }
}

export function saveState(s: DrawState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode / storage full — the draw still works, it just won't survive a reload */
  }
}

/* ── Ticket numbers ──
   Accepts ranges and single numbers separated by commas, spaces or new lines:
   "999800-999999", "001-100, 150-200", "123456 654321". Every number is
   zero-padded to the longest token, which is also how many reels the drum
   shows. */
export type ParsedSpec = { numbers: string[]; width: number; error: string | null };

const MAX_TICKETS = 5000;

export function parseSpec(spec: string): ParsedSpec {
  const tokens = spec.split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length) return { numbers: [], width: 6, error: "ยังไม่ได้ใส่หมายเลขสลาก" };

  let width = 1;
  const ranges: [number, number][] = [];
  for (const tok of tokens) {
    const m = tok.match(/^(\d{1,9})(?:[-–—](\d{1,9}))?$/);
    if (!m) return { numbers: [], width: 6, error: `อ่านไม่ออก: “${tok}”` };
    width = Math.max(width, m[1].length, m[2]?.length ?? 0);
    let a = Number(m[1]);
    let b = m[2] ? Number(m[2]) : a;
    if (a > b) [a, b] = [b, a];
    ranges.push([a, b]);
  }

  const set = new Set<number>();
  for (const [a, b] of ranges) {
    if (b - a + 1 + set.size > MAX_TICKETS)
      return { numbers: [], width, error: `มากเกินไป (สูงสุด ${MAX_TICKETS.toLocaleString()} ใบ)` };
    for (let n = a; n <= b; n++) set.add(n);
  }
  const numbers = [...set].sort((x, y) => x - y).map((n) => String(n).padStart(width, "0"));
  return { numbers, width, error: null };
}

/* The numbers still in the drum for the next spin. */
export function drawPool(s: DrawState, numbers: string[]): string[] {
  const out = new Set<string>([...s.excluded, ...s.voided]);
  for (const p of s.prizes) if (p.winner) out.add(p.winner);
  if (s.pending) out.add(s.pending.n);
  return numbers.filter((n) => !out.has(n));
}

/* Uniform pick with the platform CSPRNG — rejection sampling keeps every
   ticket exactly equally likely (no modulo bias). */
export function pickRandom<T>(arr: T[]): T {
  const n = arr.length;
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const limit = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    do c.getRandomValues(buf);
    while (buf[0] >= limit);
    return arr[buf[0] % n];
  }
  return arr[Math.floor(Math.random() * n)];
}

export const THAI_DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
