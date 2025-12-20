import React, { useEffect, useMemo, useState } from "react";

function safe(v) { return v == null ? "" : String(v); }
function fullName(n) {
  const s = safe(n).trim();
  if (!s) return "";
  if (s.includes(",")) {
    const [last, first] = s.split(",").map(x => x.trim());
    return `${first} ${last}`.trim();
  }
  return s;
}

export default function Grid() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const limitParam = params.get("limit");
  const [title, setTitle] = useState("Pregrilla");
  const [rows, setRows] = useState([]);
  const PALETTE = ["#ffd166", "#f4978e", "#caffbf", "#a0c4ff", "#ffadad", "#fdffb6", "#bde0fe", "#d0f4de"];
  const [page, setPage] = useState(0);
  const pageSize = (limitParam && parseInt(limitParam) > 0) ? parseInt(limitParam) : 16;
  function colorFor(r) {
    const n = parseInt(safe(r.number), 10);
    const idx = Number.isFinite(n) ? n % PALETTE.length : Math.abs(safe(fullName(r.name)).charCodeAt(0)) % PALETTE.length;
    return PALETTE[idx];
  }

  useEffect(() => {
    document.title = "Livetiming OBS Overlay | Pregrilla";
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/standings");
        const data = await res.json();
        if (!alive) return;
        setTitle(data.sessionName ? `Pregrilla | ${String(data.sessionName)}` : "Pregrilla");
        const list = (data.standings || []).slice().sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));
        setRows(list);
      } catch {}
    }
    load();
    const t = setInterval(load, 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (totalPages <= 1) {
      setPage(0);
      return;
    }
    const iv = setInterval(() => {
      setPage((p) => (p + 1) % totalPages);
    }, 10000);
    return () => clearInterval(iv);
  }, [rows, pageSize]);

  const start = page * pageSize;
  const view = rows.slice(start, start + pageSize);
  const pairs = [];
  for (let i = 0; i < view.length; i += 2) {
    pairs.push([view[i], view[i + 1]].filter(Boolean));
  }

  function Card({ r }) {
    const pos = safe(r.position);
    const num = safe(r.number);
    const name = safe(fullName(r.name));
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/10 min-w-[60px] h-[56px] flex items-center justify-center text-center font-extrabold text-[24px] tabular-nums text-white" style={{ background: "var(--header-bg)" }}>
          {pos}
        </div>
        <div className="flex-1 rounded-xl border border-white/10 bg-black/25 h-[56px] px-4 shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
          <div className="h-full flex items-center gap-3">
            <div className="font-extrabold uppercase italic text-[18px]">{name}</div>
            <div className="ml-auto text-black rounded-lg font-extrabold px-3 py-1.5 min-w-[44px] text-center text-[16px]" style={{ background: colorFor(r) }}>{num}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 grid place-items-center">
      <div
        className="w-[72vw] max-w-[1100px] rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm"
        style={{ background: "var(--panel)", color: "var(--text)" }}
      >
        <div className="flex items-center gap-3 px-6 py-3 font-extrabold tracking-tight border-b border-white/10 text-[22px]" style={{ background: "var(--header-bg)" }}>
          <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
          <div className="uppercase italic text-[22px]">{title}</div>
        </div>
        <div key={`page-${page}`} className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-700">
          {pairs.map((pair, idx) => (
            <div key={`pair-${idx}`} className={`${idx === 0 ? "mt-4 " : ""}grid grid-cols-2 gap-6 mb-5 items-start`}>
              <div>{pair[0] && <Card r={pair[0]} />}</div>
              <div>{pair[1] && <Card r={pair[1]} />}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
