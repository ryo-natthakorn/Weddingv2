import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, X } from "lucide-react";
import { parseSpec, type DrawState, type LogEntry, type ParsedSpec } from "./store";

type Props = {
  s: DrawState;
  parsed: ParsedSpec;
  poolSize: number;
  update: Dispatch<SetStateAction<DrawState>>;
  onClose: () => void;
};

const RESULT_LABEL: Record<LogEntry["result"], string> = {
  won: "ได้รับรางวัล",
  void: "ไม่มีผู้มารับ",
  cancel: "ยกเลิก",
  cleared: "ล้างผล",
};

/* Leading digits every ticket shares (999 for 999800–999999) are drawn faint
   in the board grid so the eye lands on the part that differs. */
function sharedPrefix(nums: string[]) {
  if (nums.length < 2) return 0;
  const a = nums[0];
  const b = nums[nums.length - 1];
  let i = 0;
  while (i < a.length - 2 && a[i] === b[i]) i++;
  return i;
}

export function SettingsSheet({ s, parsed, poolSize, update, onClose }: Props) {
  const [draft, setDraft] = useState(s.spec);
  const draftParsed = useMemo(() => parseSpec(draft), [draft]);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 3500);
    return () => clearTimeout(t);
  }, [confirmReset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const won = useMemo(() => new Set(s.prizes.map((p) => p.winner).filter(Boolean) as string[]), [s.prizes]);
  const excluded = useMemo(() => new Set(s.excluded), [s.excluded]);
  const voided = useMemo(() => new Set(s.voided), [s.voided]);
  const prefix = sharedPrefix(parsed.numbers);

  const status = (n: string) =>
    won.has(n) ? "won" : s.pending?.n === n ? "pending" : voided.has(n) ? "void" : excluded.has(n) ? "out" : "in";

  const counts = useMemo(() => {
    let out = 0;
    let voidN = 0;
    for (const n of parsed.numbers) {
      if (won.has(n) || s.pending?.n === n) continue;
      if (voided.has(n)) voidN++;
      else if (excluded.has(n)) out++;
    }
    return { out, void: voidN };
  }, [parsed.numbers, won, voided, excluded, s.pending]);

  function toggle(n: string) {
    const st = status(n);
    if (st === "won" || st === "pending") return;
    update((p) => {
      if (st === "void") return { ...p, voided: p.voided.filter((x) => x !== n) };
      if (st === "out") return { ...p, excluded: p.excluded.filter((x) => x !== n) };
      return { ...p, excluded: [...p.excluded, n] };
    });
  }

  function setPrize(id: string, patch: Partial<{ name: string; sub: string }>) {
    update((p) => ({ ...p, prizes: p.prizes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }

  function clearWinner(id: string) {
    update((p) => {
      const prize = p.prizes.find((x) => x.id === id);
      if (!prize?.winner) return p;
      return {
        ...p,
        prizes: p.prizes.map((x) => (x.id === id ? { ...x, winner: null } : x)),
        activeId: id,
        log: [...p.log, { n: prize.winner, prize: prize.name, at: Date.now(), result: "cleared" }],
      };
    });
  }

  function removePrize(id: string) {
    update((p) => {
      const prizes = p.prizes.filter((x) => x.id !== id);
      if (!prizes.length) return p;
      return { ...p, prizes, activeId: p.activeId === id ? prizes[0].id : p.activeId };
    });
  }

  function addPrize() {
    update((p) => ({
      ...p,
      prizes: [
        ...p.prizes,
        { id: `p${Date.now().toString(36)}`, name: `รางวัลพิเศษ ${p.prizes.length - 1 || ""}`.trim(), sub: "Special prize", winner: null },
      ],
    }));
  }

  function resetAll() {
    update((p) => ({
      ...p,
      voided: [],
      pending: null,
      prizes: p.prizes.map((x) => ({ ...x, winner: null })),
      activeId: p.prizes[0].id,
      log: [],
    }));
    setConfirmReset(false);
  }

  const time = (t: number) =>
    new Date(t).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <motion.div
      className="ld-overlay ld-overlay-sheet"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        className="ld-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="ตั้งค่าการจับรางวัล"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 34, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ld-sheet-head">
          <div>
            <p className="ld-kicker">Settings</p>
            <h2>ตั้งค่าการจับรางวัล</h2>
          </div>
          <button className="ld-icon" onClick={onClose} aria-label="ปิด">
            <X size={24} strokeWidth={1.8} />
          </button>
        </header>

        <section className="ld-sec">
          <h3>สลากที่ไม่ได้แจก</h3>
          <p className="ld-help">
            หลังปิดลงทะเบียน แตะเลขที่ยังติดอยู่บนบอร์ด (ไม่มีแขกหยิบไป) เพื่อไม่ให้เลขนั้นถูกออกรางวัล — แตะซ้ำเพื่อคืน
          </p>
          <div className="ld-legend">
            <span><i data-status="in" /> ร่วมลุ้น {poolSize}</span>
            <span><i data-status="out" /> ไม่ได้แจก {counts.out}</span>
            <span><i data-status="void" /> ไม่มีผู้มารับ {counts.void}</span>
            <span><i data-status="won" /> ผู้โชคดี {won.size}</span>
          </div>
          <div className="ld-grid">
            {parsed.numbers.map((n) => (
              <button key={n} className="ld-cell" data-status={status(n)} onClick={() => toggle(n)} aria-label={n}>
                {prefix > 0 && <span className="ld-cell-pre">{n.slice(0, prefix)}</span>}
                {n.slice(prefix)}
              </button>
            ))}
          </div>
          {s.excluded.length > 0 && (
            <button className="ld-link" onClick={() => update((p) => ({ ...p, excluded: [] }))}>
              ให้ทุกใบกลับมาร่วมลุ้น
            </button>
          )}
        </section>

        <section className="ld-sec">
          <h3>รางวัล</h3>
          <div className="ld-prize-list">
            {s.prizes.map((p) => (
              <div className="ld-prize-edit" key={p.id}>
                <div className="ld-prize-fields">
                  <input
                    value={p.name}
                    onChange={(e) => setPrize(p.id, { name: e.target.value })}
                    aria-label="ชื่อรางวัล (ไทย)"
                  />
                  <input
                    className="ld-input-sub"
                    value={p.sub}
                    placeholder="English subtitle"
                    onChange={(e) => setPrize(p.id, { sub: e.target.value })}
                    aria-label="ชื่อรางวัล (อังกฤษ)"
                  />
                </div>
                <div className="ld-prize-state">
                  {p.winner ? (
                    <>
                      <span className="ld-prize-winner">{p.winner}</span>
                      <button className="ld-link" onClick={() => clearWinner(p.id)}>
                        ล้างผล
                      </button>
                    </>
                  ) : (
                    <span className="ld-muted">{s.pending?.prizeId === p.id ? "รอยืนยัน" : "ยังไม่จับ"}</span>
                  )}
                  {s.prizes.length > 1 && !p.winner && s.pending?.prizeId !== p.id && (
                    <button className="ld-icon ld-icon-sm" onClick={() => removePrize(p.id)} aria-label={`ลบ ${p.name}`}>
                      <Trash2 size={18} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className="ld-btn ld-btn-ghost ld-btn-sm" onClick={addPrize}>
            <Plus size={18} strokeWidth={2} /> เพิ่มรางวัล
          </button>
        </section>

        <section className="ld-sec">
          <h3>หมายเลขสลาก</h3>
          <p className="ld-help">ใส่เป็นช่วงหรือเลขเดี่ยว คั่นด้วยจุลภาค เช่น 999800-999999</p>
          <div className="ld-spec">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="หมายเลขสลาก"
            />
            <button
              className="ld-btn ld-btn-teal ld-btn-sm"
              disabled={draft.trim() === s.spec.trim() || !!draftParsed.error}
              onClick={() => update((p) => ({ ...p, spec: draft.trim() }))}
            >
              ใช้ชุดนี้
            </button>
          </div>
          <p className={draftParsed.error ? "ld-help ld-error" : "ld-help"}>
            {draftParsed.error ?? `${draftParsed.numbers.length.toLocaleString()} ใบ · ${draftParsed.width} หลัก`}
          </p>
        </section>

        <section className="ld-sec">
          <h3>ประวัติการจับ</h3>
          {s.log.length ? (
            <ol className="ld-log">
              {[...s.log].reverse().map((l, i) => (
                <li key={`${l.at}-${i}`}>
                  <span className="ld-log-time">{time(l.at)}</span>
                  <span className="ld-log-num">{l.n}</span>
                  <span className="ld-log-prize">{l.prize}</span>
                  <span className="ld-log-res" data-result={l.result}>{RESULT_LABEL[l.result]}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ld-muted">ยังไม่มีการจับรางวัล</p>
          )}
        </section>

        <section className="ld-sec">
          <h3>เริ่มใหม่</h3>
          <p className="ld-help">
            ล้างผู้โชคดี ประวัติ และเลขที่ไม่มีผู้มารับ ใช้หลังซ้อมก่อนงาน — หมายเลขสลาก ชื่อรางวัล และสลากที่ไม่ได้แจกยังอยู่
          </p>
          <button className="ld-btn ld-btn-danger ld-btn-sm" onClick={() => (confirmReset ? resetAll() : setConfirmReset(true))}>
            {confirmReset ? "แตะอีกครั้งเพื่อยืนยัน" : "ล้างผลทั้งหมด"}
          </button>
        </section>
      </motion.aside>
    </motion.div>
  );
}
