import React from "react";
import { TrendingUp } from "lucide-react";

export default function Overtakes({ badge, who, gain }) {
  const g = typeof gain === "number" && Number.isFinite(gain) ? gain : 0;
  return (
    <div
      className="absolute left-full top-0 ml-[160px] rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm h-[45px] flex items-center px-5 font-bold tracking-tight whitespace-nowrap border border-white/10"
      style={{ background: "var(--panel)" }}
    >
      <div className="relative z-10 uppercase italic text-[18px] duration-300 drop-shadow-md text-white flex items-center gap-3">
        <TrendingUp color="#4ade80" style={{ width: "1.2em", height: "1.2em" }} />
        <span className="text-white/80">ADELANTAMIENTOS:</span>
        <span className="text-[#4ade80]">+{g}</span>
        <span className="text-black rounded-md font-extrabold px-2 py-0.5 min-w-[36px]" style={{ background: "#ffd166" }}>{badge || ""}</span>
        <span className="italic font-extrabold text-white">{who || ""}</span>
      </div>
    </div>
  );
}
