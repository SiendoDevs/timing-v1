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

export default function Results() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const limitParam = params.get("limit");
  const [title, setTitle] = useState("Resultados Provisorios");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const PALETTE = ["#ffd166", "#f4978e", "#caffbf", "#a0c4ff", "#ffadad", "#fdffb6", "#bde0fe", "#d0f4de"];
  const pageSize = (limitParam && parseInt(limitParam) > 0) ? parseInt(limitParam) : 16;
  function colorFor(r) {
    const n = parseInt(safe(r.number), 10);
    const idx = Number.isFinite(n) ? n % PALETTE.length : Math.abs(safe(fullName(r.name)).charCodeAt(0)) % PALETTE.length;
    return PALETTE[idx];
  }
  function totalLabel(r) {
    const v = r ? (r.totalTime || r.bestLap || r.lastLap || r.gap || r.diff) : "";
    return safe(v);
  }

  useEffect(() => {
    document.title = "Livetiming OBS Overlay | Resultados";
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/standings");
        const data = await res.json();
        if (!alive) return;
        setTitle(data.sessionName ? `Resultados Provisorios | ${String(data.sessionName)}` : "Resultados Provisorios");
        const list = (data.standings || []).slice().sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));
        setRows(list);
      } catch {}
    }
    load();
    const t = setInterval(load, 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const top3 = rows.slice(0, 3);
  const restAll = rows.slice(3);
  const totalPages = Math.max(1, Math.ceil(restAll.length / pageSize));

  useEffect(() => {
    if (totalPages <= 1) {
      setPage(0);
      return;
    }
    const t = setInterval(() => {
      setPage(p => (p + 1) % totalPages);
    }, 10000);
    return () => clearInterval(t);
  }, [totalPages]);

  const currentRest = restAll.slice(page * pageSize, (page + 1) * pageSize);
  const pairs = [];
  for (let i = 0; i < currentRest.length; i += 2) {
    pairs.push([currentRest[i], currentRest[i + 1]].filter(Boolean));
  }

  function PodiumCard({ r, rank }) {
    const name = safe(fullName(r?.name));
    const num = safe(r?.number);
    
    let boxStyle = {};
    let cardBorder = "";
    let cardBg = "";
    
    if (rank === 1) { // Gold
      boxStyle = { background: "linear-gradient(135deg, #FFD700 0%, #FDB931 100%)", color: "black", boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)" };
      cardBorder = "border-yellow-500/50";
      cardBg = "bg-yellow-900/20";
    } else if (rank === 2) { // Silver / Platinum
      boxStyle = { background: "linear-gradient(135deg, #E0E0E0 0%, #B0B0B0 100%)", color: "black", boxShadow: "0 0 20px rgba(192, 192, 192, 0.5)" };
      cardBorder = "border-gray-400/50";
      cardBg = "bg-gray-800/30";
    } else { // Bronze
      boxStyle = { background: "linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)", color: "white", boxShadow: "0 0 20px rgba(205, 127, 50, 0.5)" };
      cardBorder = "border-orange-700/50";
      cardBg = "bg-orange-900/20";
    }

    const h = rank === 1 ? 140 : rank === 2 ? 110 : 100;
    
    return (
      <div className={`rounded-xl border px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.35)] flex items-center gap-4 ${cardBg} ${cardBorder}`} style={{ height: `${h}px` }}>
        <div className="rounded-xl min-w-[72px] h-[72px] flex items-center justify-center text-center font-extrabold text-[32px]" style={boxStyle}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold uppercase italic text-[20px] leading-tight truncate">{name || "-"}</div>
          <div className="text-sm opacity-80 mt-0.5 truncate">Mejor vuelta: {totalLabel(r) || "-"}</div>
        </div>
        <div className="text-black rounded-lg font-extrabold px-3 py-1.5 min-w-[44px] text-center text-[18px]" style={{ background: colorFor(r || {}) }}>{num}</div>
      </div>
    );
  }

  function RowCard({ r }) {
    const pos = safe(r.position);
    const num = safe(r.number);
    const name = safe(fullName(r.name));
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/10 min-w-[60px] h-[56px] flex items-center justify-center text-center font-extrabold text-[24px] tabular-nums text-white" style={{ background: "var(--header-bg)" }}>
          {pos}
        </div>
        <div className="flex-1 rounded-xl border border-white/10 bg-black/25 h-[56px] px-4 shadow-[0_8px_28px_rgba(0,0,0,0.35)] min-w-0">
          <div className="h-full flex items-center gap-3">
            <div className="font-extrabold uppercase italic text-[18px] truncate flex-1">{name}</div>
            <div className="text-black rounded-lg font-extrabold px-3 py-1.5 min-w-[44px] text-center text-[16px]" style={{ background: colorFor(r) }}>{num}</div>
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
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
              <PodiumCard r={top3[1]} rank={2} />
              <PodiumCard r={top3[0]} rank={1} />
              <PodiumCard r={top3[2]} rank={3} />
            </div>
            <div key={page} className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {pairs.map((pair, idx) => (
              <React.Fragment key={`pair-${idx}`}>
                <div>{pair[0] && <RowCard r={pair[0]} />}</div>
                <div>{pair[1] && <RowCard r={pair[1]} />}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
