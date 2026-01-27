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

function formatTime(val) {
  return safe(val); // Placeholder for more complex formatting if needed
}

// --- Components ---

function Header({ title }) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md mb-8">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 bg-[var(--accent)] transform -skew-x-12" />
          <div className="font-black tracking-tighter text-3xl text-white italic">RESULTADOS</div>
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

function PodiumStep({ driver, rank }) {
  if (!driver) return <div className="flex-1" />;

  const isFirst = rank === 1;
  const height = isFirst ? "h-64" : rank === 2 ? "h-52" : "h-44";
  const color = isFirst ? "bg-yellow-500" : rank === 2 ? "bg-gray-300" : "bg-orange-600";
  const glow = isFirst ? "shadow-yellow-500/20" : rank === 2 ? "shadow-gray-300/20" : "shadow-orange-600/20";
  
  return (
    <div className={`flex flex-col items-center justify-end ${isFirst ? "-mt-12 z-10" : ""}`}>
        <div className="mb-4 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">P{rank}</div>
            <div className="font-black italic text-xl md:text-3xl text-white mb-1 drop-shadow-lg">{fullName(driver.name)}</div>
            <div className="font-mono text-[var(--accent)] font-bold">#{driver.number}</div>
        </div>
        
        <div className={`w-full max-w-[180px] ${height} ${color} rounded-t-lg relative group shadow-2xl ${glow}`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-white/20" />
            <div className="absolute bottom-4 left-0 right-0 text-center font-black text-6xl text-white/20 select-none">
                {rank}
            </div>
            {/* Best Lap or Time */}
            <div className="absolute top-4 inset-x-0 text-center">
                 <div className="inline-block px-3 py-1 bg-black/40 backdrop-blur-sm rounded text-xs font-mono text-white font-bold border border-white/10">
                    {formatTime(driver.bestLap || driver.totalTime || driver.gap)}
                 </div>
            </div>
        </div>
    </div>
  );
}

function ResultRow({ r, isEven }) {
    const pos = safe(r.position);
    const num = safe(r.number);
    const name = safe(fullName(r.name));
    const time = formatTime(r.gap || r.diff || r.totalTime || r.bestLap);
    
    return (
        <div className={`flex items-center gap-4 p-3 border-l-2 ${isEven ? "bg-white/[0.02]" : "bg-transparent"} border-transparent hover:bg-white/5 hover:border-[var(--accent)] transition-all group`}>
            <div className="w-8 shrink-0 font-mono text-center font-bold text-white/50 group-hover:text-white">{pos}</div>
            <div className="w-10 shrink-0 font-mono text-right font-bold text-[var(--accent)]">#{num}</div>
            <div className="flex-1 font-bold italic tracking-tight text-lg text-white/90 leading-tight">{name}</div>
            <div className="font-mono text-sm text-white/60">{r.laps}L</div>
            <div className="font-mono text-sm font-bold text-white text-right min-w-[100px]">{time}</div>
        </div>
    );
}

export default function Results() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const limitParam = params.get("limit");
  const [title, setTitle] = useState("Resultados");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  
  // Settings
  const pageSize = (limitParam && parseInt(limitParam) > 0) ? parseInt(limitParam) : 10; // Podium + 10 pilots per page

  useEffect(() => {
    document.title = "RESULTADOS | StreamRace 1.0";
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

  // Determine grid layout for non-podium
  // We want 2 columns of rows
  const midPoint = Math.ceil(currentRest.length / 2);
  const col1 = currentRest.slice(0, midPoint);
  const col2 = currentRest.slice(midPoint);

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

      <div className="flex-1 flex flex-col p-6 pt-16 max-w-7xl mx-auto w-full gap-10">
        
        {/* Podium Section */}
        {top3.length > 0 && (
             <div className="flex items-end justify-center gap-4 md:gap-8 pb-8 border-b border-white/5 min-h-[350px]">
                <div className="order-1"><PodiumStep driver={top3[1]} rank={2} /></div>
                <div className="order-2"><PodiumStep driver={top3[0]} rank={1} /></div>
                <div className="order-3"><PodiumStep driver={top3[2]} rank={3} /></div>
             </div>
        )}

        {/* Results List */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 content-start">
             {/* Column 1 */}
             <div className="space-y-1">
                 {col1.length > 0 && <div className="flex text-xs font-bold uppercase tracking-wider text-white/30 px-3 pb-2 border-b border-white/5 mb-2">
                    <div className="w-8 shrink-0 text-center">Pos</div>
                    <div className="w-10 shrink-0 text-right">#</div>
                    <div className="flex-1 ml-4">Piloto</div>
                    <div className="mr-4">Vueltas</div>
                    <div className="text-right w-[100px]">Tiempo/Dif</div>
                 </div>}
                 {col1.map((r, i) => <ResultRow key={r.number} r={r} isEven={i % 2 === 0} />)}
             </div>

             {/* Column 2 */}
             <div className="space-y-1">
                 {col2.length > 0 && <div className="flex text-xs font-bold uppercase tracking-wider text-white/30 px-3 pb-2 border-b border-white/5 mb-2">
                    <div className="w-8 shrink-0 text-center">Pos</div>
                    <div className="w-10 shrink-0 text-right">#</div>
                    <div className="flex-1 ml-4">Piloto</div>
                    <div className="mr-4">Vueltas</div>
                    <div className="text-right w-[100px]">Tiempo/Dif</div>
                 </div>}
                 {col2.map((r, i) => <ResultRow key={r.number} r={r} isEven={i % 2 === 0} />)}
             </div>
        </div>

        {/* Footer / Pagination Info */}
        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/30">
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
