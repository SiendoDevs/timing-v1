import React, { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// --- Components ---

function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        onLogin(data.token);
      } else {
        setError("Contraseña incorrecta");
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center text-white">
      <form onSubmit={handleSubmit} className="bg-[#141414] p-8 rounded-xl border border-white/10 w-full max-w-sm space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
           <div className="w-12 h-12 bg-[var(--accent)] mx-auto transform -skew-x-12 mb-4" />
           <h1 className="text-2xl font-black italic uppercase">Admin Access</h1>
        </div>
        
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider opacity-60">Password</label>
           <input 
             type="password" 
             value={password}
             onChange={e => setPassword(e.target.value)}
             className="w-full px-4 py-3 rounded bg-black/40 border border-white/10 outline-none focus:border-[var(--accent)] transition-colors text-center tracking-widest text-lg"
             autoFocus
             placeholder="••••••••"
           />
        </div>

        {error && <div className="text-red-500 text-sm font-bold text-center bg-red-500/10 py-2 rounded border border-red-500/20">{error}</div>}

        <button 
          disabled={loading}
          className="w-full py-3 bg-[var(--accent)] text-black font-bold uppercase italic tracking-wider rounded hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="block w-full">
      <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1.5">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded bg-black/40 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm font-mono transition-all"
      />
    </label>
  );
}

function SectionHeader({ title, color = "var(--accent)", icon, status }) {
  return (
    <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
      <div className="w-1.5 h-4 -skew-x-12" style={{ background: color }} />
      <div className="font-black italic uppercase tracking-tight text-lg">{title}</div>
      {status && <div className="ml-auto text-xs font-mono text-white/60 truncate max-w-[200px] animate-pulse">{status}</div>}
      {icon && <div className={`${status ? "ml-3" : "ml-auto"} opacity-50`}>{icon}</div>}
    </div>
  );
}

function StatusBadge({ active, labelActive, labelInactive }) {
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
      active 
        ? "bg-green-500/10 border-green-500/20 text-green-400" 
        : "bg-red-500/10 border-red-500/20 text-red-400"
    }`}>
      {active ? labelActive : labelInactive}
    </span>
  );
}

function ActionButton({ onClick, disabled, active, label, activeLabel, type = "normal", icon }) {
  let baseClass = "w-full px-4 py-3 font-bold uppercase italic tracking-wider rounded text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const types = {
    normal: active 
      ? "bg-white/10 text-white border border-white/10 hover:bg-white/20"
      : "bg-[var(--accent)] text-black border border-transparent hover:brightness-110",
    danger: active
      ? "bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30"
      : "bg-green-500/20 text-green-200 border border-green-500/30 hover:bg-green-500/30",
    link: "bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono"
  };

  const currentLabel = active && activeLabel ? activeLabel : label;

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClass} ${types[type]}`}>
      {icon && <span>{icon}</span>}
      {currentLabel}
    </button>
  );
}

export default function Dashboard() {
  // Auth State
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  
  // State
  const [url, setUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [scrapingEnabled, setScrapingEnabled] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [votingWidgetEnabled, setVotingWidgetEnabled] = useState(true);
  const [overtakesEnabled, setOvertakesEnabled] = useState(true);
  const [currentLapEnabled, setCurrentLapEnabled] = useState(true);
  const [fastestLapEnabled, setFastestLapEnabled] = useState(true);
  const [lapFinishEnabled, setLapFinishEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [debug, setDebug] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [fullData, setFullData] = useState(null);
  const [updateDuration, setUpdateDuration] = useState(null);
  const [raceFlag, setRaceFlag] = useState("GREEN");
  const [blackFlagNum, setBlackFlagNum] = useState("");
  
  const savingRef = useRef(false);
  useEffect(() => { savingRef.current = saving; }, [saving]);

  // Voting State
  const [votingActive, setVotingActive] = useState(false);
  const [votingCandidates, setVotingCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [voteStats, setVoteStats] = useState({ totalVotes: 0, candidates: [] });

  // Effects & Logic
  
  function logout() {
    setToken(null);
    localStorage.removeItem("admin_token");
  }

  function handleLogin(newToken) {
    setToken(newToken);
    localStorage.setItem("admin_token", newToken);
  }

  useEffect(() => {
    if (!token) return;
    const apiOrigin = import.meta.env.VITE_API_URL || "";
    const fetchLoop = async () => {
      try {
        const t0 = performance.now();
        const res = await fetch(`${apiOrigin}/api/standings`);
        const data = await res.json();
        setUpdateDuration(Math.round(performance.now() - t0));
        
        if (data) {
          if (data.updatedAt) setLastUpdated(data.updatedAt);
          if (data.sessionName) setSessionName(data.sessionName);
          if (data.raceFlag) setRaceFlag(data.raceFlag);
          if (Array.isArray(data.standings)) {
            setPreviewRows(data.standings.slice(0, 12));
            setFullData(data);
          }
        }

        const vRes = await fetch(`${apiOrigin}/api/voting/status`);
        if (vRes.ok) {
          const vData = await vRes.json();
          setVotingActive(vData.active);
          setVoteStats({ totalVotes: vData.totalVotes, candidates: vData.candidates || [] });
          if (vData.active && vData.candidates) setVotingCandidates(vData.candidates);
        }
      } catch (e) { console.error("Loop error", e); }
    };
    const interval = setInterval(fetchLoop, 1000);
    fetchLoop();
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    document.title = "DASHBOARD | StreamRace 1.0";
    loadConfig(true); // true = isInitial load, don't set URL
    const interval = setInterval(() => {
      if (!savingRef.current) {
        loadConfig();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (raceFlag && raceFlag.startsWith("BLACK:")) {
      const parts = raceFlag.split(":");
      if (parts[1]) setBlackFlagNum(parts[1]);
    }
  }, [raceFlag]);

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  async function loadConfig(isInitial = false) {
    const apiOrigin = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${apiOrigin}/api/config`);
    const data = await res.json();
    if (!isInitial) setUrl(data.speedhiveUrl || "");
    if (!isInitial) setPublicUrl(data.publicUrl || "");
    setOverlayEnabled(data.overlayEnabled !== false);
    setScrapingEnabled(data.scrapingEnabled !== false);
    setCommentsEnabled(data.commentsEnabled !== false);
    setVotingWidgetEnabled(data.votingWidgetEnabled !== false);
    setOvertakesEnabled(data.overtakesEnabled !== false);
    setCurrentLapEnabled(data.currentLapEnabled !== false);
    setFastestLapEnabled(data.fastestLapEnabled !== false);
    setLapFinishEnabled(data.lapFinishEnabled !== false);
    if (data.raceFlag) setRaceFlag(data.raceFlag);
  }

  async function saveConfig(updates = {}) {
    setSaving(true);
    setStatus("");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const initialData = (fullData && fullData.source === url) ? fullData : null;
      
      const body = { 
        speedhiveUrl: url,
        publicUrl, 
        overlayEnabled, 
        scrapingEnabled, 
        commentsEnabled, 
        votingWidgetEnabled,
        overtakesEnabled,
        currentLapEnabled,
        fastestLapEnabled,
        lapFinishEnabled,
        initialData,
        ...updates 
      };

      const res = await fetch(`${apiOrigin}/api/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      
      // Update local state based on what was saved
      if (updates.overlayEnabled !== undefined) setOverlayEnabled(data.overlayEnabled);
      if (updates.scrapingEnabled !== undefined) setScrapingEnabled(data.scrapingEnabled);
      if (updates.commentsEnabled !== undefined) setCommentsEnabled(data.commentsEnabled);
      if (updates.votingWidgetEnabled !== undefined) setVotingWidgetEnabled(data.votingWidgetEnabled);
      if (updates.overtakesEnabled !== undefined) setOvertakesEnabled(data.overtakesEnabled);
      if (updates.currentLapEnabled !== undefined) setCurrentLapEnabled(data.currentLapEnabled);
      if (updates.fastestLapEnabled !== undefined) setFastestLapEnabled(data.fastestLapEnabled);
      if (updates.lapFinishEnabled !== undefined) setLapFinishEnabled(data.lapFinishEnabled);
      
      setStatus("Configuración guardada");
    } catch (e) {
      setStatus(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function probar() {
    setStatus("Probando…");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/standings?debug=1&force=1&url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setLastUpdated(data.updatedAt || Date.now());
      setSessionName(data.sessionName || "");
      setDebug(data.debug || null);
      setPreviewRows(Array.isArray(data.standings) ? data.standings.slice(0, 12) : []);
      setFullData(data);
      setStatus("OK - Datos recibidos");
    } catch (e) {
      setStatus("Error al probar conexión");
    }
  }

  async function startVoting() {
    if (selectedCandidates.length < 2) return setStatus("Selecciona al menos 2 pilotos");
    setSaving(true);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/voting/start`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ candidates: selectedCandidates })
      });
      
      if (res.status === 401) { logout(); return; }

      setVotingActive(true);
      setVotingCandidates(selectedCandidates);
      setStatus("Votación iniciada");
    } catch (e) { setStatus(String(e)); } 
    finally { setSaving(false); }
  }

  async function stopVoting() {
    setSaving(true);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/voting/stop`, { 
        method: "POST", 
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.status === 401) { logout(); return; }

      // If finished with 0 votes, clear selection
      if (voteStats.totalVotes === 0) {
        setSelectedCandidates([]);
      }

      setVotingActive(false);
      setStatus("Votación finalizada");
    } catch (e) { setStatus(String(e)); } 
    finally { setSaving(false); }
  }

  function toggleCandidate(row) {
    if (votingActive) return; 
    setSelectedCandidates(prev => {
      const exists = prev.find(c => c.number === row.number);
      return exists ? prev.filter(c => c.number !== row.number) : [...prev, { number: row.number, name: row.name }];
    });
  }

  async function updateFlag(flag) {
    setRaceFlag(flag);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/flag`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ flag })
      });
      if (res.status === 401) logout();
    } catch (e) { console.error(e); }
  }

  // --- Render ---

  return (
    <div className="h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-[var(--accent)] selection:text-black overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md z-30">
        <div className="w-full px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[var(--accent)] transform -skew-x-12" />
            <div className="font-black tracking-tighter text-xl text-white italic">STREAMRACE 1.0</div>
          </div>
          
          <div className="h-6 w-px bg-white/10" />
          
          <div className="flex items-center gap-3">
             {sessionName ? (
               <div className="text-white font-bold tracking-wide uppercase">{sessionName}</div>
             ) : (
               <div className="text-white/30 font-mono text-sm">SIN SESIÓN</div>
             )}
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs font-mono">
             {status && <div className="text-white/60 uppercase tracking-wider animate-pulse mr-4">{status}</div>}
             <button onClick={logout} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded hover:bg-red-500/20 transition-all font-bold uppercase">
                Salir
             </button>
             <button 
                onClick={() => saveConfig({ scrapingEnabled: !scrapingEnabled })}
                className={`px-3 py-1 rounded font-bold uppercase transition-all border ${
                  scrapingEnabled 
                    ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20" 
                    : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                }`}
              >
                {scrapingEnabled ? "SCRAPING ACTIVO" : "SCRAPING PAUSADO"}
             </button>

             <div className={`px-2 py-1 rounded flex items-center gap-2 border ${updateDuration > 500 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${updateDuration > 500 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                LATENCIA: {updateDuration || 0}ms
             </div>
             {lastUpdated && <div className="text-white/40">{new Date(lastUpdated).toLocaleTimeString()}</div>}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column: Config (3 cols) */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Connection Card */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl shrink-0">
            <SectionHeader title="Fuente de Datos" icon="📡" status={status} />
            <div className="p-4 space-y-4">
              <Input
                label="Speedhive URL"
                value={url}
                onChange={setUrl}
                placeholder="https://speedhive.mylaps.com/..."
              />
              <Input
                label="URL Pública de Votación (Opcional)"
                value={publicUrl}
                onChange={setPublicUrl}
                placeholder="https://tudominio.com (para QR)"
              />
              <div className="grid grid-cols-2 gap-3">
                 <ActionButton onClick={() => saveConfig()} disabled={saving} label="Guardar" type="normal" />
                 <ActionButton onClick={probar} label="Probar" type="link" />
              </div>
            </div>
          </div>

          {/* Visibility Controls */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl shrink-0">
            <SectionHeader title="Transmisión" icon="📺" />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Overlay Principal</div>
                <button onClick={() => saveConfig({ overlayEnabled: !overlayEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${overlayEnabled ? "bg-green-500" : "bg-white/10"}`}>
                   <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${overlayEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Comentarios AI</div>
                <button onClick={() => saveConfig({ commentsEnabled: !commentsEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${commentsEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${commentsEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Widget Votación</div>
                <button onClick={() => saveConfig({ votingWidgetEnabled: !votingWidgetEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${votingWidgetEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${votingWidgetEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Vueltas</div>
                <button onClick={() => saveConfig({ currentLapEnabled: !currentLapEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${currentLapEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${currentLapEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Adelantamientos</div>
                <button onClick={() => saveConfig({ overtakesEnabled: !overtakesEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${overtakesEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${overtakesEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Récord de Vuelta</div>
                <button onClick={() => saveConfig({ fastestLapEnabled: !fastestLapEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${fastestLapEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${fastestLapEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Final de Vuelta</div>
                <button onClick={() => saveConfig({ lapFinishEnabled: !lapFinishEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${lapFinishEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${lapFinishEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="pt-2 border-t border-white/5">
                 <div className="font-bold text-[10px] text-white/40 uppercase mb-2 text-center">Overlays</div>
                 <div className="grid grid-cols-3 gap-2">
                   <button onClick={() => window.open("/livetiming", "_blank")} className="px-2 py-2 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 rounded border border-white/5 text-center">Timing</button>
                   <button onClick={() => window.open("/grid", "_blank")} className="px-2 py-2 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 rounded border border-white/5 text-center">Grid</button>
                   <button onClick={() => window.open("/results", "_blank")} className="px-2 py-2 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 rounded border border-white/5 text-center">Results</button>
                 </div>
              </div>
              
              <div className="mt-4 text-center">
                <span className="text-[10px] font-mono text-white/20">v{__APP_VERSION__}</span>
              </div>
            </div>
          </div>



        </div>

        {/* Center Column: Race Control (4 cols) */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Race Flags */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl shrink-0">
            <SectionHeader title="Banderas" icon="🚩" />
            <div className="p-4 grid grid-cols-2 gap-2">
               <button onClick={() => updateFlag("GREEN")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "GREEN" ? "bg-green-500 text-black border-transparent shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"}`}>
                  VERDE
               </button>
               <button onClick={() => updateFlag("YELLOW")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "YELLOW" ? "bg-yellow-500 text-black border-transparent shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20"}`}>
                  AMARILLA
               </button>
               <button onClick={() => updateFlag("SC")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "SC" ? "bg-orange-500 text-black border-transparent shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse" : "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20"}`}>
                  SAFETY CAR
               </button>
               <button onClick={() => updateFlag("SLOW")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "SLOW" ? "bg-orange-500 text-black border-transparent shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse" : "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20"}`}>
                  SLOW
               </button>
               <button onClick={() => updateFlag("BLUE")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "BLUE" ? "bg-blue-600 text-white border-transparent shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-pulse" : "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"}`}>
                  AZUL
               </button>
               <button onClick={() => updateFlag("WHITE")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "WHITE" ? "bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}>
                  BLANCA
               </button>
               <button onClick={() => updateFlag("RED")} className={`col-span-2 p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "RED" ? "bg-red-600 text-white border-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"}`}>
                  ROJA
               </button>
               <button onClick={() => updateFlag("FINISH")} className={`col-span-2 p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "FINISH" ? "bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}>
                  FINAL (AJEDREZ)
               </button>

               <div className="col-span-2 flex gap-2 pt-2 border-t border-white/5 mt-2">
                 <input 
                    value={blackFlagNum}
                    onChange={(e) => setBlackFlagNum(e.target.value)}
                    placeholder="#"
                    className="w-20 bg-black/40 border border-white/20 rounded text-center font-mono font-bold text-white focus:border-[var(--accent)] outline-none"
                 />
                 <button 
                    onClick={() => {
                      const target = blackFlagNum ? `BLACK:${blackFlagNum}` : "BLACK";
                      updateFlag(raceFlag === target ? "GREEN" : target);
                    }} 
                    className={`flex-1 p-3 rounded font-black text-sm uppercase border transition-all ${raceFlag && raceFlag.startsWith("BLACK") ? "bg-black text-white border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse" : "bg-black/40 text-gray-400 border-white/10 hover:bg-black/60"}`}
                 >
                    BANDERA NEGRA
                 </button>
               </div>
            </div>
          </div>

          {/* Voting Manager */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col shrink-0">
             <div className="bg-white/[0.02] flex flex-col">
                <SectionHeader title="Piloto Destacado" icon="🗳️" />
                <div className="p-6 flex-1 flex flex-col">
                  {!votingActive ? (
                    <div className="flex flex-col gap-6">
                       <div className="text-center">
                         <div className="text-white/60 text-xs max-w-xs mx-auto">
                           Selecciona pilotos en la tabla de la derecha.
                         </div>
                       </div>
                       
                       <div className="flex items-center justify-center py-2">
                         {selectedCandidates.length > 0 ? (
                           <div className="flex flex-wrap gap-2 justify-center content-center">
                              {selectedCandidates.map(c => (
                                <span key={c.number} onClick={() => toggleCandidate(c)} className="cursor-pointer group relative px-3 py-1.5 bg-white/10 rounded-md border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all">
                                   <span className="font-bold text-[var(--accent)] mr-2">#{c.number}</span>
                                   <span className="font-medium text-sm">{c.name}</span>
                                   <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
                                </span>
                              ))}
                           </div>
                         ) : (
                           <div className="w-full p-4 border-2 border-dashed border-white/10 rounded-xl text-white/20 text-sm italic text-center flex flex-col items-center gap-2">
                             <span>Ningún piloto seleccionado</span>
                           </div>
                         )}
                       </div>

                       <div className="mt-auto">
                          <button 
                            onClick={startVoting} 
                            disabled={selectedCandidates.length < 2} 
                            className="w-full py-3 font-black uppercase italic tracking-wider rounded text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transform hover:-translate-y-1"
                          >
                            INICIAR VOTACIÓN
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="font-bold text-green-400 tracking-wide uppercase text-xs">En curso</span>
                        </div>
                        <div className="text-xl font-black tabular-nums">{voteStats.totalVotes} <span className="text-xs font-medium opacity-50">votos</span></div>
                      </div>

                      <div className="space-y-2">
                        {voteStats.candidates.sort((a,b) => b.votes - a.votes).map(c => (
                          <div key={c.number} className="relative group">
                            <div className="flex justify-between text-xs font-bold mb-1 z-10 relative">
                              <span className="flex items-center gap-2">
                                <span className="text-[var(--accent)]">#{c.number}</span>
                                {c.name}
                              </span>
                              <span>{c.percent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--accent)] transition-all duration-500 ease-out" style={{ width: `${c.percent}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <ActionButton 
                          onClick={stopVoting} 
                          label="FINALIZAR VOTACIÓN" 
                          type="danger" 
                          active={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
             </div>
             
             {votingActive && (
               <div className="w-full bg-white/5 p-4 flex flex-col items-center justify-center gap-4 text-center border-t border-white/5">
                  <div className="p-2 bg-white rounded-xl shadow-2xl">
                    <QRCodeSVG value={publicUrl ? `${publicUrl.replace(/\/$/, "")}/vote` : `${window.location.protocol}//${window.location.hostname}:${window.location.port}/vote`} size={120} />
                  </div>
                  <div className="space-y-1">
                    <a href={publicUrl ? `${publicUrl.replace(/\/$/, "")}/vote` : "/vote"} target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline decoration-blue-500/30 underline-offset-4">
                      {publicUrl ? `${publicUrl.replace(/\/$/, "")}/vote` : "/vote page"}
                    </a>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: Data Table (5 cols) */}
        <div className="col-span-12 xl:col-span-5 flex flex-col bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl min-h-0">
          <SectionHeader title="Selección de Candidatos" icon="📋" />
          <div className="flex-1 overflow-auto custom-scrollbar">
            {/* Quick Selection Toolbar */}
            <div className="sticky top-0 z-20 bg-[#1a1a1a] border-b border-white/5 p-2 flex gap-2 overflow-x-auto">
                <button onClick={() => setSelectedCandidates([])} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Limpiar
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={() => setSelectedCandidates(previewRows.slice(0, 3).map(r => ({ number: r.number, name: r.name })))} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Top 3
                </button>
                <button onClick={() => setSelectedCandidates(previewRows.slice(0, 5).map(r => ({ number: r.number, name: r.name })))} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Top 5
                </button>
                <button onClick={() => setSelectedCandidates(previewRows.slice(0, 10).map(r => ({ number: r.number, name: r.name })))} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Top 10
                </button>
                <button onClick={() => setSelectedCandidates(previewRows.map(r => ({ number: r.number, name: r.name })))} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Todos
                </button>
                <div className="ml-auto flex items-center text-[10px] font-mono text-white/40">
                   {selectedCandidates.length} SELECCIONADOS
                </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead className="sticky top-[45px] bg-[#1a1a1a] z-10 shadow-lg">
                <tr className="text-xs font-bold uppercase tracking-wider text-white/50">
                  <th className="p-3 w-10 text-center">Sel</th>
                  <th className="p-3">Pos</th>
                  <th className="p-3">#</th>
                  <th className="p-3">Piloto</th>
                  <th className="p-3 text-right">M. Vuelta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {previewRows.map((r, i) => {
                   const isSelected = selectedCandidates.some(c => c.number === r.number);
                   return (
                     <tr 
                       key={i} 
                       onClick={() => toggleCandidate(r)} 
                       className={`group cursor-pointer transition-colors hover:bg-white/5 ${isSelected ? "bg-green-500/10" : ""}`}
                     >
                       <td className="p-3 text-center">
                         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-green-500 border-green-500 text-black" : "border-white/20 group-hover:border-white/40"}`}>
                           {isSelected && <span className="text-[10px]">✓</span>}
                         </div>
                       </td>
                       <td className="p-3 font-mono font-bold text-sm">{r.position}</td>
                       <td className="p-3 font-mono text-[var(--accent)] font-bold text-sm">#{r.number}</td>
                       <td className="p-3 font-bold text-sm">{r.name}</td>
                       <td className="p-3 font-mono text-right text-sm">{r.bestLap}</td>
                     </tr>
                   );
                })}
                {previewRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-white/20 italic">
                      Esperando datos...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
