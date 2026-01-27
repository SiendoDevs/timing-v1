import React from "react";
import { motion } from "framer-motion";
import { Timer } from "lucide-react";
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
  
  // Diff logic
  // We assume if prevPos is undefined/null, diff is 0, unless handled by parent.
  // In LiveTiming.jsx: const diff = (lastPositions.current.size > 0 && prevVal != null) ? prevVal - curPos : 0;
  // We'll rely on prevPos being passed correctly (or we check for null here).
  // But we don't know lastPositions.size here.
  // So maybe better to pass 'initialDiff' or just 'diff'.
  // Let's improve the prop API. 
  // We will calculate diff inside, but we need to know if we have history.
  // Actually, passing 'diff' from parent is safer.
  // But let's stick to the extracted logic if possible.
  // If I change the API, I have to change LiveTiming logic.
  // Let's calculate 'diff' inside ONLY IF prevPos is valid number.
  
  let diff = (prevVal != null) ? prevVal - curPos : 0;
  
  let finalDiff = diff;
  if (finalDiff === 0 && recentChange) {
      if (Date.now() - recentChange.time < 8000) {
          finalDiff = recentChange.diff;
      }
  }

  const arrow = finalDiff !== 0
    ? finalDiff > 0
      ? <span className="text-green-500 ml-2 text-xs font-black flex items-center gap-0.5 bg-green-500/10 px-1 rounded">▲ {Math.abs(finalDiff)}</span>
      : <span className="text-red-500 ml-2 text-xs font-black flex items-center gap-0.5 bg-red-500/10 px-1 rounded">▼ {Math.abs(finalDiff)}</span>
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
      <div className="w-14 flex items-center justify-end font-black italic text-xl text-white/50 relative pr-2">
        {row.hasFinishFlag && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xs">🏁</span>}
        {!row.hasFinishFlag && isFastest && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-purple-500 flex items-center justify-center"><Timer size={20} /></span>}
        <span>{safe(row.position)}</span>
        {arrow}
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
