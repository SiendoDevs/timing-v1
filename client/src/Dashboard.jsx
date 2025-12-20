import React, { useEffect, useState } from "react";
 

function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="text-sm opacity-80 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 text-[14px]"
      />
    </label>
  );
}

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [debug, setDebug] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);

  async function loadConfig() {
    const apiOrigin = import.meta.env.VITE_API_URL || "https://timing-backend.onrender.com";
    const res = await fetch(`${apiOrigin}/api/config`);
    const data = await res.json();
    setUrl(data.speedhiveUrl || "");
    setOverlayEnabled(data.overlayEnabled !== false);
  }
  async function saveConfig() {
    setSaving(true);
    setStatus("");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "https://timing-backend.onrender.com";
      const res = await fetch(`${apiOrigin}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speedhiveUrl: url, overlayEnabled })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setStatus("Guardado");
    } catch (e) {
      setStatus(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }
  async function probar() {
    setStatus("Probando…");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "https://timing-backend.onrender.com";
      const res = await fetch(`${apiOrigin}/api/standings?debug=1&force=1&url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setLastUpdated(data.updatedAt || Date.now());
      setSessionName(data.sessionName || "");
      setDebug(data.debug || null);
      const rows = Array.isArray(data.standings) ? data.standings : [];
      setPreviewRows(rows.slice(0, 12));
      setStatus("OK");
    } catch (e) {
      setStatus("Error al probar");
    }
  }
  async function toggleOverlay() {
    setSaving(true);
    setStatus("");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "https://timing-backend.onrender.com";
      const res = await fetch(`${apiOrigin}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overlayEnabled: !overlayEnabled })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setOverlayEnabled(data.overlayEnabled !== false);
      setStatus(data.overlayEnabled ? "Overlay activado" : "Overlay oculto");
    } catch (e) {
      setStatus(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }
  function abrirOverlay() {
    window.open("/", "_blank");
  }

  useEffect(() => {
    document.title = "Livetiming OBS Overlay | Dashboard";
    loadConfig();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="sticky top-0 z-10 border-b border-white/10" style={{ background: "var(--header-bg)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="font-extrabold tracking-tight uppercase">Dashboard</div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md text-sm font-bold bg-white/10 border border-white/10 ${overlayEnabled ? "" : "bg-[var(--accent)] text-black"}`}>{overlayEnabled ? "Overlay visible" : "Overlay oculto"}</span>
            {sessionName && <span className="px-2.5 py-1 rounded-md text-sm font-bold bg-white/10 border border-white/10">{sessionName}</span>}
            {lastUpdated && <span className="px-2.5 py-1 rounded-md text-sm font-bold bg-white/10 border border-white/10">{new Date(lastUpdated).toLocaleTimeString()}</span>}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] overflow-hidden" style={{ background: "var(--panel)" }}>
            <div className="px-4 py-3 font-bold border-b border-white/10 flex items-center gap-3" style={{ background: "var(--header-bg)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
              <div>Configuración de fuente de datos</div>
            </div>
            <div className="p-4 space-y-4">
              <Input
                label="URL de Speedhive (Live Timing)"
                value={url}
                onChange={setUrl}
                placeholder="https://speedhive.mylaps.com/livetiming/XXXX/active"
              />
              <div className="flex items-center gap-3">
                <button onClick={saveConfig} disabled={saving} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-[var(--accent)] text-black hover:brightness-95 px-3 py-2 disabled:opacity-60 disabled:pointer-events-none">
                  Guardar
                </button>
                <button onClick={probar} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2">
                  Probar
                </button>
                <button onClick={abrirOverlay} className="ml-auto inline-flex items-center justify-center rounded-md text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2">
                  Abrir overlay
                </button>
              </div>
              <div className="text-sm opacity-80 flex items-center gap-4">
                {status && <span>Estado: {status}</span>}
                {sessionName && <span>Sesión: {sessionName}</span>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] overflow-hidden" style={{ background: "var(--panel)" }}>
            <div className="px-4 py-3 font-bold border-b border-white/10 flex items-center gap-3" style={{ background: "var(--header-bg)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
              <div>Pregrilla y Resultados</div>
            </div>
            <div className="p-4">
              <button onClick={() => window.open("/grid", "_blank")} className="px-4 py-3 font-extrabold inline-flex items-center justify-center rounded-md text-sm bg-white/10 hover:bg-white/15 border border-white/10">
                Abrir pregrilla
              </button>
              <button onClick={() => window.open("/results", "_blank")} className="ml-2 px-4 py-3 font-extrabold inline-flex items-center justify-center rounded-md text-sm bg-white/10 hover:bg-white/15 border border-white/10">
                Abrir resultados
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] overflow-hidden" style={{ background: "var(--panel)" }}>
            <div className="px-4 py-3 font-bold border-b border-white/10 flex items-center gap-3" style={{ background: "var(--header-bg)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
              <div>Control del overlay</div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleOverlay}
                  disabled={saving}
                  className={`px-4 py-3 font-extrabold inline-flex items-center justify-center rounded-md text-sm transition-colors border border-white/10 ${overlayEnabled ? "bg-white/10 hover:bg-white/15" : "bg-[var(--accent)] text-black"} disabled:opacity-60 disabled:pointer-events-none`}
                >
                  {overlayEnabled ? "Ocultar tabla de tiempos" : "Activar tabla de tiempos"}
                </button>
                <span className="text-sm opacity-80">Estado actual: {overlayEnabled ? "Visible" : "Oculto"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] overflow-hidden" style={{ background: "var(--panel)" }}>
            <div className="px-4 py-3 font-bold border-b border-white/10 flex items-center gap-3" style={{ background: "var(--header-bg)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
              <div>Bloque vacío</div>
            </div>
            <div className="p-4">
              <div className="text-sm opacity-70">-</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] overflow-hidden lg:col-span-2" style={{ background: "var(--panel)" }}>
            <div className="px-4 py-3 font-bold border-b border-white/10 flex items-center gap-3" style={{ background: "var(--header-bg)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
              <div>Debug de scraping</div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="font-bold">Método:</div>
                <span className="px-2.5 py-1 rounded-md text-sm font-bold bg-black/30 border border-white/10">{debug?.sourceMethod || "-"}</span>
                <div className="font-bold ml-4">Headers:</div>
                <div className="flex flex-wrap gap-1">
                  {(debug?.headers || []).map((h, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md text-xs font-bold bg-black/30 border border-white/10">
                      {h}
                    </span>
                  ))}
                  {!debug?.headers?.length && <span className="opacity-70">-</span>}
                </div>
              </div>
              <div className="relative rounded-lg border border-white/10">
                <table className="min-w-full table-fixed border-collapse">
                  <thead>
                    <tr className="bg-black/30">
                      <th className="px-2 py-2 text-left w-[60px]">Pos</th>
                      <th className="px-2 py-2 text-left w-[60px]">#</th>
                      <th className="px-2 py-2 text-left">Competitor</th>
                      <th className="px-2 py-2 text-left w-[80px]">Laps</th>
                      <th className="px-2 py-2 text-left w-[100px]">Last</th>
                      <th className="px-2 py-2 text-left w-[100px]">Diff</th>
                      <th className="px-2 py-2 text-left w-[100px]">Gap</th>
                      <th className="px-2 py-2 text-left w-[120px]">Total</th>
                      <th className="px-2 py-2 text-left w-[100px]">Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => {
                      const miss = (v) => !v || String(v).trim() === "";
                      return (
                        <tr key={`row-${i}`}>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.position) ? "bg-red-500/15" : ""}`}>{r.position ?? ""}</td>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.number) ? "bg-red-500/15" : ""}`}>{r.number ?? ""}</td>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.name) ? "bg-red-500/15" : ""}`}>{r.name ?? ""}</td>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.laps) ? "bg-red-500/15" : ""}`}>{r.laps ?? ""}</td>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.lastLap) ? "bg-red-500/15" : ""}`}>{r.lastLap ?? ""}</td>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.diff) ? "bg-red-500/15" : ""}`}>{r.diff ?? ""}</td>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.gap) ? "bg-red-500/15" : ""}`}>{r.gap ?? ""}</td>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.totalTime) ? "bg-red-500/15" : ""}`}>{r.totalTime ?? ""}</td>
                          <td className={`px-2 py-1.5 border-b border-white/10 ${miss(r.bestLap) ? "bg-red-500/15" : ""}`}>{r.bestLap ?? ""}</td>
                        </tr>
                      );
                    })}
                    {!previewRows.length && (
                      <tr>
                        <td colSpan={9} className="px-2 py-3 text-center opacity-70">
                          Sin datos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
  </div>
  );
}
