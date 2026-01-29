import React from "react";
import { motion } from "framer-motion";
import { Timer, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { safe, surname, idFor } from "../../utils/formatting";

export default function TimingRow({ 
  row, 
  prevPos, 
  recentChange, 
  isFastest, 
  mode 
}) {
  const id = idFor(row);
  const curNum = Number.parseInt(safe(row.position), 10);
  const curPos = Number.isFinite(curNum) ? curNum : 9999;
  const prevVal = Number.isFinite(prevPos) ? prevPos : null;
  const sname = surname(row.name);
  
  let diff = (prevVal != null) ? prevVal - curPos : 0;
  
  let finalDiff = diff;
  if (finalDiff === 0 && recentChange) {
      // Persist for 15s to match LiveTiming logic
      if (Date.now() - recentChange.time < 15000) {
          finalDiff = recentChange.diff;
      }
  }

  const arrow = finalDiff !== 0
    ? finalDiff > 0
      ? <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-0.5 bg-green-500/20 text-green-400 h-6 min-w-[36px] rounded-md text-xs font-black border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
        >
          <ChevronUp size={14} strokeWidth={4} />
          <span>{Math.abs(finalDiff)}</span>
        </motion.div>
      : <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-0.5 bg-red-500/20 text-red-400 h-6 min-w-[36px] rounded-md text-xs font-black border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
        >
          <ChevronDown size={14} strokeWidth={4} />
          <span>{Math.abs(finalDiff)}</span>
        </motion.div>
    : null;
  
  let metricVal = "";
  if (mode === "GAP") metricVal = row.gap || "-";
  else if (mode === "DIFF") metricVal = row.diff || "-";
  else if (mode === "TOTAL") metricVal = row.totalTime || "-";
  else if (mode === "BEST") metricVal = row.bestLap || "-";
  else if (mode === "LAST") metricVal = row.lastLap || "-";
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ 
        layout: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      className={`flex items-center gap-3 px-4 py-1.5 border-b border-white/5 bg-[#0f0f0f]/50 hover:bg-white/5 transition-colors ${isFastest && !row.hasFinishFlag ? "bg-purple-600/50 animate-pulse" : ""}`}
    >
      {/* Position */}
      <div className="w-20 flex items-center justify-end font-black italic text-xl text-white/50 relative pr-2">
        {row.hasFinishFlag && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl filter drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]">🏁</span>}
        {!row.hasFinishFlag && isFastest && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-purple-500 flex items-center justify-center"><Timer size={20} /></span>}
        <span>{safe(row.position)}</span>
        {!row.hasFinishFlag && arrow}
      </div>

      {/* Number */}
      <div className="w-10 h-8 flex items-center justify-center rounded-lg bg-white/10 font-black italic text-lg text-white border border-white/5 shadow-inner">
         {safe(row.number)}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
         <div className="font-bold italic uppercase text-lg tracking-tight text-white truncate drop-shadow-sm">{safe(sname)}</div>
      </div>

      {/* Time */}
      <div className="w-24 text-right font-mono font-bold text-lg text-[var(--accent)] tracking-tight">
        <span className="metric-swap" key={`${mode}:${id}`}>
          {safe(metricVal)}
        </span>
      </div>
    </motion.div>
  );
}
