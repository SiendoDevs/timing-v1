import React, { useEffect, useState } from "react";
import { Vote } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function VotingWidget() {
  const [data, setData] = useState({ active: false, candidates: [], totalVotes: 0 });

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
         // silent error
       }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sort and take top 10
  const sorted = [...(data.candidates || [])].sort((a,b) => b.votes - a.votes).slice(0, 10);
  const voteUrl = data.publicUrl ? `${data.publicUrl.replace(/\/$/, "")}/vote` : `${window.location.origin}/vote`;
  
  const isFinished = !data.active && data.candidates && data.candidates.length > 0 && data.totalVotes > 0;
  
  // If not active and not finished (meaning either no candidates or no votes), hide widget
  if (!data.active && !isFinished) return null;

  const winner = sorted[0];

  if (isFinished && winner) {
    return (
      <div className="rounded-xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.2)] bg-[#141414] border border-yellow-500/30 w-[260px] animate-in zoom-in duration-500">
        <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 p-1">
            <div className="flex items-center justify-center gap-2 px-3 py-3 border-b border-yellow-500/20 bg-[#0a0a0a]/80 text-yellow-500 font-black uppercase italic tracking-widest text-base">
                <Vote className="w-5 h-5" />
                <span>GANADOR</span>
            </div>
        </div>
        
        <div className="p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-yellow-500/5 blur-3xl" />
            
            <div className="relative z-10 mb-2">
                <div className="text-6xl mb-2">🏆</div>
            </div>
            
            <div className="relative z-10 w-full">
                <div className="font-black italic text-2xl text-white leading-none mb-1 break-words drop-shadow-xl uppercase">
                    {winner.name}
                </div>
                <div className="text-yellow-500 font-mono font-bold text-lg mb-4">
                    #{winner.number}
                </div>
            </div>

            <div className="relative z-10 w-full grid grid-cols-2 gap-2 text-xs font-mono border-t border-white/10 pt-4">
                <div className="flex flex-col">
                    <span className="text-white/40 uppercase">Votos</span>
                    <span className="text-white font-bold text-lg">{winner.votes}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-white/40 uppercase">Total</span>
                    <span className="text-[var(--accent)] font-bold text-lg">{winner.percent}%</span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.5)] bg-[#141414] border border-white/5 w-[220px] animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#0a0a0a] text-[var(--accent)] font-extrabold uppercase italic text-sm">
        <Vote className="w-4 h-4" />
        <span>Piloto StreamRace</span>
      </div>
      
      <div className="p-5">
        <div className="space-y-3 mb-5">
          {sorted.map(c => (
             <div key={c.number} className="text-xs">
                <div className="flex justify-between text-white/90 font-bold mb-0.5 uppercase italic">
                   <span className="truncate pr-2">{c.name}</span>
                   <span className="tabular-nums text-[var(--accent)]">{c.percent}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${c.percent}%` }} />
                </div>
             </div>
          ))}
          {sorted.length === 0 && <div className="text-white/50 text-xs italic">Sé el primero en votar</div>}
        </div>
        
        <div className="pt-3 border-t border-white/10 flex flex-col items-center gap-2">
           <div className="bg-white p-1 rounded shadow-lg">
              <QRCodeSVG value={voteUrl} size={100} />
           </div>
           <div className="text-[10px] text-white/60 font-mono text-center leading-tight">
              ESCANEA PARA VOTAR
           </div>
        </div>
      </div>
    </div>
  );
}
