import React from "react";
import { Flag } from "lucide-react";

export default function CurrentLap({ finishFlag, lapsLabel, lapsChangeAnim }) {
  return (
    <div 
      className={`relative rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.5)] h-[54px] flex items-center px-6 font-bold tracking-tight whitespace-nowrap border border-white/5 transform-gpu ${finishFlag ? "w-[160px]" : ""}`}
      style={{
        position: 'relative',
        ...(finishFlag ? {
          backgroundColor: "#fff",
          backgroundImage: `repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)`,
          backgroundSize: "27px 27px",
          backgroundPosition: "calc(50% - 13.5px) calc(50% - 13.5px)"
        } : {
          background: "#141414"
        })
      }}
    >
      <div className={`absolute top-0 bottom-0 left-0 bg-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.6)] z-0 pointer-events-none ${lapsChangeAnim ? "animate-progress-temp" : ""}`} />
      <div className={`relative z-10 uppercase italic text-xl duration-300 drop-shadow-md flex items-center gap-3 ${finishFlag ? "hidden" : "text-white"} ${lapsChangeAnim ? "animate-in fade-in zoom-in" : ""}`}>
        <Flag className="w-6 h-6 text-white/50" />
        {finishFlag ? "" : lapsLabel}
      </div>
    </div>
  );
}
