import React, { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  Tv, 
  Library, 
  Save, 
  Trash2, 
  Map as MapIcon, 
  Flag, 
  Timer, 
  Calendar, 
  User,
  Info,
  X,
  Radio,
  Server,
  Award,
  ListChecks,
  Check,
  Wifi,
  Upload as UploadIcon,
  CloudSun,
  LayoutDashboard,
  Settings,
  CircleHelp
} from "lucide-react";

import Input from "./components/ui/Input";
import SectionHeader from "./components/ui/SectionHeader";
import ActionButton from "./components/ui/ActionButton";
import Login from "./components/dashboard/Login";
import UsersManager from "./components/dashboard/UsersManager";
import CircuitInfo from "./components/dashboard/CircuitInfo.jsx";
import WeatherPanel from "./components/weather/WeatherPanel.jsx";
import ConfigPanel from "./components/dashboard/ConfigPanel.jsx";
import HelpPanel from "./components/dashboard/HelpPanel.jsx";

export default function Dashboard() {
  // Auth State
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const [showUsers, setShowUsers] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  
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
  const [mechFlagNum, setMechFlagNum] = useState("");
  const [penaltyFlagNum, setPenaltyFlagNum] = useState("");
  const [penaltyFlagTime, setPenaltyFlagTime] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  
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
    document.title = `DASHBOARD | StreamRace ${__APP_VERSION__}`;
    loadConfig(true);  
    const interval = setInterval(() => {
      if (!savingRef.current) {
        loadConfig(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (raceFlag) {
        if (raceFlag.startsWith("BLACK:")) {
            const parts = raceFlag.split(":");
            if (parts[1]) setBlackFlagNum(parts[1]);
        } else if (raceFlag.startsWith("MEATBALL:")) {
            const parts = raceFlag.split(":");
            if (parts[1]) setMechFlagNum(parts[1]);
        } else if (raceFlag.startsWith("PENALTY:")) {
            const parts = raceFlag.split(":");
            if (parts[1]) setPenaltyFlagNum(parts[1]);
            if (parts[2]) setPenaltyFlagTime(parts[2]);
        }
    }
  }, [raceFlag]);

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  async function loadConfig(isInitial = false) {
    const apiOrigin = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${apiOrigin}/api/config`);
    const data = await res.json();
    
    // Fix: Only update text fields on initial load to prevent overwriting user input while typing
    if (isInitial) {
      setUrl(data.speedhiveUrl || "");
      setPublicUrl(data.publicUrl || "");
    }
    
    setOverlayEnabled(data.overlayEnabled !== false);
    setScrapingEnabled(data.scrapingEnabled !== false);
    setCommentsEnabled(data.commentsEnabled !== false);
    setVotingWidgetEnabled(data.votingWidgetEnabled !== false);
    setOvertakesEnabled(data.overtakesEnabled !== false);
    setCurrentLapEnabled(data.currentLapEnabled !== false);
    setFastestLapEnabled(data.fastestLapEnabled !== false);
    setLapFinishEnabled(data.lapFinishEnabled !== false);
    if (data.raceFlag) setRaceFlag(data.raceFlag);
    if (data.logoUrl) setLogoUrl(data.logoUrl);
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
        logoUrl,
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
      if (updates.logoUrl !== undefined) setLogoUrl(data.logoUrl);
      
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
    // Toggle logic: if clicking the same flag (and it's not GREEN), revert to GREEN
    let target = flag;
    if (flag !== "GREEN" && raceFlag === flag) {
      target = "GREEN";
    }

    setRaceFlag(target);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/flag`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ flag: target })
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
            <div className="font-black tracking-tighter text-xl text-white italic">STREAMRACE <span className="font-light opacity-80">v{__APP_VERSION__}</span></div>
          </div>
          
          <div className="h-6 w-px bg-white/10" />

          {/* Navigation */}
          <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("dashboard")}
              title="Dashboard"
              className={`p-2 rounded-md transition-all ${
                activeTab === "dashboard"
                  ? "bg-[var(--accent)] text-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard size={20} />
            </button>
            <button
              onClick={() => setActiveTab("circuit")}
              title="Circuito"
              className={`p-2 rounded-md transition-all ${
                activeTab === "circuit"
                  ? "bg-[var(--accent)] text-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <MapIcon size={20} />
            </button>
            <button
              onClick={() => setActiveTab("weather")}
              title="Clima"
              className={`p-2 rounded-md transition-all ${
                activeTab === "weather"
                  ? "bg-[var(--accent)] text-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <CloudSun size={20} />
            </button>
            <button
              onClick={() => setActiveTab("config")}
              title="Configuración"
              className={`p-2 rounded-md transition-all ${
                activeTab === "config"
                  ? "bg-[var(--accent)] text-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => setActiveTab("help")}
              title="Ayuda"
              className={`p-2 rounded-md transition-all ${
                activeTab === "help"
                  ? "bg-[var(--accent)] text-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <CircleHelp size={20} />
            </button>
          </nav>
          
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
             <button onClick={() => setShowUsers(true)} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded hover:bg-blue-500/20 transition-all font-bold uppercase mr-2">
                Usuarios
             </button>
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
             {logoUrl && <img src={logoUrl} className="h-6 w-auto ml-4 object-contain max-w-[150px]" alt="Logo" />}
          </div>
        </div>
      </div>

      {activeTab === "dashboard" && (
      <div className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column: Configuration (2 cols) */}
        <div className="col-span-12 xl:col-span-2 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
           {/* Visibility Controls */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl h-fit">
            <SectionHeader title="Transmisión" icon={<Tv className="w-5 h-5 text-[var(--accent)]" />} />
            <div className="p-4 space-y-2">
                <ToggleRow label="Overlay Principal" checked={overlayEnabled} onChange={() => saveConfig({ overlayEnabled: !overlayEnabled })} />
                <ToggleRow label="Comentarios AI" checked={commentsEnabled} onChange={() => saveConfig({ commentsEnabled: !commentsEnabled })} />
                <ToggleRow label="Widget Votación" checked={votingWidgetEnabled} onChange={() => saveConfig({ votingWidgetEnabled: !votingWidgetEnabled })} />
                <ToggleRow label="Vueltas" checked={currentLapEnabled} onChange={() => saveConfig({ currentLapEnabled: !currentLapEnabled })} />
                <ToggleRow label="Adelantamientos" checked={overtakesEnabled} onChange={() => saveConfig({ overtakesEnabled: !overtakesEnabled })} />
                <ToggleRow label="Récord de Vuelta" checked={fastestLapEnabled} onChange={() => saveConfig({ fastestLapEnabled: !fastestLapEnabled })} />
                <ToggleRow label="Final de Vuelta" checked={lapFinishEnabled} onChange={() => saveConfig({ lapFinishEnabled: !lapFinishEnabled })} />

                <div className="pt-2 border-t border-white/5 mt-2">
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

        {/* Center Column: Race Control (5 cols) */}
        <div className="col-span-12 xl:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Race Flags */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl shrink-0">
            <SectionHeader title="Banderas" icon={<Flag className="w-5 h-5 text-[var(--accent)]" />} />
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
               <button onClick={() => updateFlag("RED")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "RED" ? "bg-red-600 text-white border-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"}`}>
                  ROJA
               </button>
               <button onClick={() => updateFlag("FINISH")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "FINISH" ? "bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}>
                  FINAL
               </button>

               <div className="col-span-2 border-t border-white/5 mt-2 pt-2 space-y-2">
                 {/* Row 1: Black & Meatball */}
                 <div className="grid grid-cols-2 gap-2">
                    {/* BLACK FLAG */}
                    <div className="flex gap-1">
                      <input 
                        value={blackFlagNum}
                        onChange={(e) => setBlackFlagNum(e.target.value)}
                        placeholder="#"
                        className="w-12 bg-black/40 border border-white/20 rounded text-center font-mono font-bold text-white focus:border-[var(--accent)] outline-none text-sm"
                      />
                      <button 
                        onClick={() => updateFlag(blackFlagNum ? `BLACK:${blackFlagNum}` : "BLACK")} 
                        className={`flex-1 rounded py-3 font-bold text-xs uppercase border transition-all flex items-center justify-center gap-2 ${raceFlag && raceFlag.startsWith("BLACK") ? "bg-black text-white border-white/50 animate-pulse" : "bg-black/40 text-gray-400 border-white/10 hover:bg-black/60"}`}
                      >
                        B. NEGRA
                      </button>
                    </div>

                    {/* MEATBALL FLAG */}
                    <div className="flex gap-1">
                      <input 
                        value={mechFlagNum}
                        onChange={(e) => setMechFlagNum(e.target.value)}
                        placeholder="#"
                        className="w-12 bg-black/40 border border-white/20 rounded text-center font-mono font-bold text-white focus:border-[var(--accent)] outline-none text-sm"
                      />
                      <button 
                        onClick={() => updateFlag(mechFlagNum ? `MEATBALL:${mechFlagNum}` : "MEATBALL")} 
                        className={`flex-1 rounded py-3 font-bold text-xs uppercase border transition-all flex items-center justify-center gap-2 relative overflow-hidden ${raceFlag && raceFlag.startsWith("MEATBALL") ? "bg-black text-orange-500 border-orange-500 animate-pulse" : "bg-black/40 text-gray-400 border-white/10 hover:bg-black/60"}`}
                      >
                         <div className="w-2 h-2 rounded-full bg-orange-500 border border-black" />
                         REPARACIÓN
                      </button>
                    </div>
                 </div>

                 {/* Row 2: Penalty */}
                 <div className="flex gap-1">
                    <input 
                       value={penaltyFlagNum}
                       onChange={(e) => setPenaltyFlagNum(e.target.value)}
                       placeholder="#"
                       className="w-12 bg-black/40 border border-white/20 rounded text-center font-mono font-bold text-white focus:border-[var(--accent)] outline-none text-sm"
                    />
                    <input 
                       value={penaltyFlagTime}
                       onChange={(e) => setPenaltyFlagTime(e.target.value)}
                       placeholder="+5s"
                       className="w-14 bg-black/40 border border-white/20 rounded text-center font-mono font-bold text-white focus:border-[var(--accent)] outline-none text-sm"
                    />
                    <button 
                       onClick={() => updateFlag(penaltyFlagNum ? `PENALTY:${penaltyFlagNum}:${penaltyFlagTime || ""}` : "PENALTY")} 
                       className={`flex-1 py-3 rounded font-black text-xs uppercase border transition-all relative overflow-hidden ${raceFlag && raceFlag.startsWith("PENALTY") ? "text-black border-white animate-pulse" : "bg-black/40 text-gray-400 border-white/10 hover:bg-black/60"}`}
                       style={raceFlag && raceFlag.startsWith("PENALTY") ? { background: "linear-gradient(135deg, white 50%, black 50%)" } : {}}
                    >
                       <span className={raceFlag && raceFlag.startsWith("PENALTY") ? "bg-white/80 px-1 rounded shadow-sm" : ""}>SANCIÓN</span>
                    </button>
                 </div>
               </div>
            </div>
          </div>

          {/* Voting Manager */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col shrink-0">
             <div className="bg-white/[0.02] flex flex-col">
                <SectionHeader title="Piloto StreamRace" icon={<Award className="w-5 h-5 text-[var(--accent)]" />} />
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
                                   <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <X className="w-3 h-3 text-white" />
                                   </span>
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
          <SectionHeader title="Selección de Candidatos" icon={<ListChecks className="w-5 h-5 text-[var(--accent)]" />} />
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
                          {isSelected && <Check className="w-3 h-3" />}
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
      )}

      {activeTab === "circuit" && <CircuitInfo token={token} />}
      {activeTab === "weather" && <WeatherPanel token={token} />}
      {activeTab === "config" && (
        <ConfigPanel 
          url={url}
          setUrl={setUrl}
          publicUrl={publicUrl}
          setPublicUrl={setPublicUrl}
          status={status}
          saving={saving}
          saveConfig={saveConfig}
          probar={probar}
          overlayEnabled={overlayEnabled}
          commentsEnabled={commentsEnabled}
          votingWidgetEnabled={votingWidgetEnabled}
          overtakesEnabled={overtakesEnabled}
          currentLapEnabled={currentLapEnabled}
          fastestLapEnabled={fastestLapEnabled}
          lapFinishEnabled={lapFinishEnabled}
          scrapingEnabled={scrapingEnabled}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
        />
      )}
      {activeTab === "help" && <HelpPanel />}
      {showUsers && <UsersManager token={token} onClose={() => setShowUsers(false)} />}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
    <div className="font-bold text-xs uppercase">{label}</div>
    <button onClick={onChange} className={`w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-green-500" : "bg-white/10"}`}>
        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
    </div>
  );
}
