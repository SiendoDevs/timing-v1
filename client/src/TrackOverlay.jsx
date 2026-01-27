import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

export default function TrackOverlay() {
  const [circuit, setCircuit] = useState(null);

  useEffect(() => {
    const apiOrigin = import.meta.env.VITE_API_URL || "";
    const fetchCircuit = async () => {
      try {
        const res = await fetch(`${apiOrigin}/api/circuit`);
        if (res.ok) {
          const data = await res.json();
          setCircuit(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchCircuit();
    // Poll occasionally in case it updates live
    const interval = setInterval(fetchCircuit, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!circuit) return null;

  const hasRecord = circuit.recordTime || circuit.recordDriver;
  const hasMap = !!circuit.mapUrl;

  return (
    <div className="min-h-screen bg-transparent p-10 font-sans text-white flex items-center justify-center">
      <div className="w-[800px] bg-black/95 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/20 animate-in fade-in zoom-in duration-500 flex flex-col relative">
        
        {/* Header Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-[var(--accent)] to-red-600"></div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
           {/* Background accent */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 blur-[80px] rounded-full pointer-events-none -z-0"></div>

           {/* Left Column: Info */}
           <div className="flex flex-col justify-center space-y-6 z-10">
              <div>
                <h3 className="text-[var(--accent)] font-bold uppercase tracking-widest text-sm mb-1">Circuito</h3>
                <h1 className="text-4xl font-black italic uppercase leading-none">{circuit.name || "Nombre del Circuito"}</h1>
                {circuit.location && (
                    <div className="flex items-center gap-2 mt-2 text-white/60 font-medium">
                        <MapPin className="w-4 h-4 text-[var(--accent)]" /> {circuit.location}
                    </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                 <div>
                    <div className="text-xs uppercase text-white/40 font-bold tracking-wider">Longitud</div>
                    <div className="text-2xl font-black font-mono">{circuit.length || "-"}</div>
                 </div>
                 <div>
                    <div className="text-xs uppercase text-white/40 font-bold tracking-wider">Curvas</div>
                    <div className="text-2xl font-black font-mono">{circuit.turns || "-"}</div>
                 </div>
              </div>

              {hasRecord && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-xs uppercase text-[var(--accent)] font-bold tracking-wider mb-2 flex items-center gap-2">
                          ⏱️ Récord de Vuelta
                      </div>
                      <div className="font-mono text-3xl font-black text-white">{circuit.recordTime || "-:--.---"}</div>
                      <div className="flex justify-between items-end mt-1">
                          <div className="font-bold text-lg">{circuit.recordDriver || "---"}</div>
                          <div className="text-sm text-white/40 font-mono">{circuit.recordYear}</div>
                      </div>
                  </div>
              )}
           </div>

           {/* Right Column: Map */}
           <div className="flex items-center justify-center relative min-h-[300px]">
              {hasMap ? (
                 <img 
                    src={circuit.mapUrl} 
                    alt="Mapa Circuito" 
                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                 />
              ) : (
                 <div className="text-white/20 italic font-bold text-2xl border-2 border-dashed border-white/10 rounded-xl p-8 w-full h-full flex items-center justify-center">
                    Sin Mapa
                 </div>
              )}
           </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 p-3 flex justify-between items-center text-xs font-mono uppercase tracking-widest text-white/40 border-t border-white/10">
            <span>StreamRace Timing</span>
            <span>Información Oficial</span>
        </div>
      </div>
    </div>
  );
}
