import React from "react";

export default function ActionButton({ onClick, disabled, active, label, activeLabel, type = "normal", icon }) {
  let baseClass = "w-full px-4 py-3 font-bold uppercase italic tracking-wider rounded text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const types = {
    normal: active 
      ? "bg-white/10 text-white border border-white/10 hover:bg-white/20"
      : "bg-[var(--accent)] text-black border border-transparent hover:brightness-110",
    danger: active
      ? "bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30"
      : "bg-green-500/20 text-green-200 border border-green-500/30 hover:bg-green-500/30",
    link: "bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono"
  };

  const currentLabel = active && activeLabel ? activeLabel : label;

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClass} ${types[type]}`}>
      {icon && <span>{icon}</span>}
      {currentLabel}
    </button>
  );
}
