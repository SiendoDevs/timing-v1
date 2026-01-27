import React from "react";

export default function SectionHeader({ title, color = "var(--accent)", icon, status }) {
  return (
    <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
      <div className="w-1.5 h-4 -skew-x-12" style={{ background: color }} />
      <div className="font-black italic uppercase tracking-tight text-lg">{title}</div>
      {status && <div className="ml-auto text-xs font-mono text-white/60 truncate max-w-[200px] animate-pulse">{status}</div>}
      {icon && <div className={`${status ? "ml-3" : "ml-auto"} opacity-50`}>{icon}</div>}
    </div>
  );
}
