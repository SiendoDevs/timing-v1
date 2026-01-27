import React, { useEffect, useState } from "react";

export default function VotingOverlay() {
  const [data, setData] = useState({ active: false, candidates: [], totalVotes: 0 });

  useEffect(() => {
    document.title = `VOTACION | StreamRace ${__APP_VERSION__}`;
  }, []);

  useEffect(() => {
    const apiOrigin = import.meta.env.VITE_API_URL || "";
    const fetchStatus = async () => {
       try {
         const res = await fetch(`${apiOrigin}/api/voting/status`);
         if (res.ok) {
           const d = await res.json();
           setData(d);
         }
       } catch (e) {
         console.error(e);
       }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!data.active && (!data.candidates || data.candidates.length === 0)) return null;

  // Sort by votes descending
  const sorted = [...(data.candidates || [])].sort((a,b) => b.votes - a.votes);
  // Take top 5 if too many
  const displayList = sorted.slice(0, 5);

  return (
    <div className="min-h-screen bg-transparent p-10 font-sans text-white flex flex-col items-start justify-end pb-20">
       <div className="w-[400px] bg-black/90 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.8)] border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-[var(--accent)] p-3 text-center font-extrabold text-xl uppercase tracking-wider text-white shadow-lg relative overflow-hidden">
             <div className="absolute inset-0 bg-white/10 skew-x-[-20deg] translate-x-[-50%]"></div>
             Piloto Destacado
          </div>
          <div className="p-5 space-y-4">
             {displayList.map((c, i) => (
               <div key={c.number} className="relative">
                  <div className="flex justify-between items-end mb-1 z-10 relative">
                     <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-400 text-sm">#{c.number}</span>
                        <span className="font-bold text-lg leading-none">{c.name}</span>
                     </div>
                     <span className="font-mono font-bold text-[var(--accent)] text-lg">{c.percent}%</span>
                  </div>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                     <div 
                        className="h-full bg-gradient-to-r from-[var(--accent)] to-red-400 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(230,0,0,0.5)]" 
                        style={{ width: `${c.percent}%` }} 
                     />
                  </div>
               </div>
             ))}
             {displayList.length === 0 && <div className="text-center opacity-50 py-4">Esperando votos...</div>}
          </div>
          <div className="bg-black/60 p-2 text-center text-xs font-mono opacity-80 border-t border-white/10">
             Vota escaneando el QR
          </div>
       </div>
    </div>
  );
}
