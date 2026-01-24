import React, { useEffect, useMemo, useState } from "react";

// --- Helpers ---
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

// --- Components ---

function Header({ title }) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md mb-8">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 bg-[var(--accent)] transform -skew-x-12" />
          <div className="font-black tracking-tighter text-3xl text-white italic">GRILLA DE LARGADA</div>
        </div>
        <div className="h-10 w-px bg-white/10" />
        <div className="text-white font-bold tracking-wide uppercase text-xl">{title || "Cargando..."}</div>
        <div className="ml-auto flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold font-mono text-white/70 tracking-widest">VIVO</span>
        </div>
      </div>
    </div>
  );
}

function GridSlot({ r }) {
    if (!r) return null;
    
    const pos = safe(r.position);
    const num = safe(r.number);
    const name = safe(fullName(r.name));

    return (
        <div className="flex items-center gap-4 transform transition-all duration-500 hover:scale-[1.02] w-full max-w-[550px]">
            {/* Position Box */}
            <div className="w-16 h-16 flex items-center justify-center font-black text-3xl italic bg-white/5 border border-white/10 rounded-lg text-white/50 shrink-0">
                {pos}
            </div>

            {/* Driver Card */}
            <div className="flex-1 flex items-center gap-4 p-4 bg-[#141414] border border-white/5 rounded-xl shadow-lg relative overflow-hidden group">
                {/* Accent Bar */}
                <div className="absolute top-0 bottom-0 w-1 bg-[var(--accent)] left-0" />
                
                {/* Number */}
                <div className="font-mono font-bold text-3xl text-[var(--accent)]">#{num}</div>
                
                {/* Name */}
                <div className="flex-1 min-w-0">
                    <div className="font-black italic text-2xl uppercase tracking-tight text-white truncate">{name}</div>
                </div>
            </div>
        </div>
    );
}

export default function Grid() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const limitParam = params.get("limit");
  const [title, setTitle] = useState("Pregrilla");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  
  // Settings
  const pageSize = (limitParam && parseInt(limitParam) > 0) ? parseInt(limitParam) : 10;

  useEffect(() => {
    document.title = "GRILLA | StreamRace 1.0";
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/standings");
        const data = await res.json();
        if (!alive) return;
        setTitle(data.sessionName || "Sesión Actual");
        const list = (data.standings || []).slice().sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));
        setRows(list);
      } catch {}
    }
    load();
    const t = setInterval(load, 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

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

  const currentView = rows.slice(page * pageSize, (page + 1) * pageSize);
  
  // Create pairs for the staggered grid layout
  const pairs = [];
  for (let i = 0; i < currentView.length; i += 2) {
    pairs.push([currentView[i], currentView[i + 1]]);
  }

  return (
    <div className="min-h-screen bg-animated-orange text-gray-200 font-sans selection:bg-[var(--accent)] selection:text-black overflow-hidden flex flex-col relative">
      <div className="bg-lines-container">
        <div className="bg-line-glow medium"></div>
        <div className="bg-line-glow thick"></div>
        <div className="bg-line-glow thin"></div>
        <div className="bg-line-glow medium"></div>
        <div className="bg-line-glow thin"></div>
        <div className="bg-line-glow thick"></div>
      </div>
      <Header title={title} />

      <div className="flex-1 flex flex-col p-8 pt-16 max-w-6xl mx-auto w-full relative">
        {/* Track Line / Center Decoration */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px border-l-2 border-dashed border-white/5 -translate-x-1/2 pointer-events-none" />

        <div className="space-y-2 pb-8 flex-1 flex flex-col justify-center">
                    {pairs.map((pair, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-8 relative">
                            {/* Left Slot (Odd Positions: 1, 3, 5...) */}
                            <div className="flex justify-end">
                                <GridSlot r={pair[0]} />
                            </div>

                            {/* Right Slot (Even Positions: 2, 4, 6...) - Staggered down slightly */}
                            <div className="flex justify-start pt-6">
                                <GridSlot r={pair[1]} />
                            </div>
                        </div>
                    ))}
                </div>

        {/* Footer / Pagination Info */}
        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/30 bg-transparent relative z-10">
            <div>SISTEMA DE CRONOMETRAJE V2.0</div>
            {totalPages > 1 && (
                <div className="flex gap-1">
                    {Array.from({length: totalPages}).map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i === page ? "bg-[var(--accent)]" : "bg-white/10"}`} />
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
