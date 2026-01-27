import React from "react";
import { animate, useMount } from "react-ui-animate";
import { Timer } from "lucide-react";

export default function LapPopup({ show, activeCard, timerDisplay }) {
  const mounted = useMount(show && !!activeCard, { from: 0, enter: 1, exit: 0 });

  return (
    <>
      {mounted((a, isMounted) => (
        isMounted && activeCard && (
          <animate.div
            style={{ opacity: a, translateY: a.to([0, 1], ["8px", "0px"]) }}
            className={`fixed right-[calc(var(--overlay-m)*1px)] bottom-[calc(var(--overlay-m)*1px)] w-[320px] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 bg-[#141414] ${activeCard.type === 'FASTEST' ? "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]" : ""}`}
          >
            {/* Progress Bar Background */}
            {activeCard.type === 'FINISH' && activeCard.stage === 'result' && (
              <div className={`absolute top-0 bottom-0 left-0 animate-progress z-0 pointer-events-none ${activeCard.data.deltaMs > 0 ? "bg-red-500/20" : "bg-green-500/20"}`} />
            )}
            
            {/* FASTEST LAP DESIGN */}
            {activeCard.type === 'FASTEST' ? (
               <div className="relative z-10 overflow-hidden">
                  {/* Background Glow */}
                  <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-600/20 blur-[60px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                  
                  {/* Header: Label */}
                  <div className="px-5 py-3 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-purple-400">
                          <Timer className="w-5 h-5 animate-pulse" />
                          <span className="font-black italic uppercase tracking-widest text-sm">Récord de Vuelta</span>
                      </div>
                      <div className="w-16 h-1 bg-purple-500 rounded-full" />
                  </div>

                  {/* Main Content */}
                  <div className="p-6 flex flex-col items-center relative">
                      {/* Time */}
                      <div className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] mb-3 tabular-nums relative z-10">
                          {activeCard.data.time}
                      </div>
                      
                      {/* Driver Info */}
                      <div className="flex items-center gap-3 w-full bg-white/5 rounded-lg p-2 border border-white/10">
                          <div className="w-12 h-10 flex items-center justify-center rounded bg-purple-600 text-white font-black italic text-xl shadow-lg shrink-0">
                              {activeCard.data.number}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="font-black italic uppercase text-xl leading-none truncate text-white/90">
                                  {activeCard.data.name}
                              </div>
                          </div>
                      </div>
                  </div>
               </div>
            ) : (
              /* STANDARD DESIGN (FINISH / OTHER) */
              <>
                <div className="relative z-10 px-4 py-3 flex items-center gap-3 border-b border-white/10 bg-[#0a0a0a]">
                   <div className="w-10 h-8 flex items-center justify-center rounded bg-white/10 font-black italic text-lg text-white">
                      {activeCard.data.number}
                   </div>
                   <div className="font-black uppercase italic text-xl leading-none truncate flex-1 text-white">
                      {activeCard.data.name}
                   </div>
                </div>

                <div className="relative z-10 p-4">
                  <div className="flex flex-col items-center justify-center min-h-[60px]">
                    <div className={`text-5xl font-black tabular-nums leading-none tracking-tighter text-center italic transition-all duration-300 ${activeCard.stage === 'result' ? (activeCard.data.deltaMs > 0 ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]") : "text-white"}`}>
                      {timerDisplay}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center pt-3 mt-2 border-t border-white/10">
                        {activeCard.data.deltaMs !== null && Math.abs(activeCard.data.deltaMs) < 10000 && activeCard.stage === 'result' ? (
                        <div className={`px-3 py-1 rounded font-black tabular-nums leading-none tracking-tight italic text-xl shadow-lg ${activeCard.data.deltaMs < 0 ? "bg-green-500 text-black" : "bg-red-500 text-white"}`}>
                            {activeCard.data.deltaMs > 0 ? "+" : ""}{(activeCard.data.deltaMs / 1000).toFixed(2)}
                        </div>
                        ) : (
                        <div className="text-white/30 text-xs font-bold italic uppercase tracking-widest">EN CURSO</div>
                        )}
                  </div>
                </div>
              </>
            )}
          </animate.div>
        )
      ))}
    </>
  );
}
