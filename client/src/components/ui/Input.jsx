import React from "react";

export default function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block w-full">
      <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1.5">{label}</div>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded bg-black/40 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm font-mono transition-all"
      />
    </label>
  );
}
