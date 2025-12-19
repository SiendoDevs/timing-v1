import React from "react";

export default function CurrentLap({ finishFlag, lapsLabel, lapsChangeAnim }) {
  return (
    <div 
      className={`absolute top-0 left-full ml-3 rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm h-[45px] flex items-center px-5 font-bold tracking-tight whitespace-nowrap border border-white/10 ${finishFlag ? "w-[140px]" : ""}`}
      style={finishFlag ? {
        backgroundColor: "#fff",
        backgroundImage: `repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)`,
        backgroundSize: "22px 22px",
        backgroundPosition: "calc(50% - 11px) calc(50% - 11px)"
      } : {
        background: "var(--panel)"
      }}
    >
      <div className={`absolute top-0 bottom-0 left-0 bg-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.6)] z-0 pointer-events-none ${lapsChangeAnim ? "animate-progress-temp" : ""}`} />
      <div className={`relative z-10 uppercase italic text-[18px] duration-300 drop-shadow-md ${finishFlag ? "hidden" : "text-white"} ${lapsChangeAnim ? "animate-in fade-in zoom-in" : ""}`}>
        {finishFlag ? "" : lapsLabel}
      </div>
    </div>
  );
}
