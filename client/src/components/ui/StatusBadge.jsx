import React from "react";

export default function StatusBadge({ active, labelActive, labelInactive }) {
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
      active 
        ? "bg-green-500/10 border-green-500/20 text-green-400" 
        : "bg-red-500/10 border-red-500/20 text-red-400"
    }`}>
      {active ? labelActive : labelInactive}
    </span>
  );
}
