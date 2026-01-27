
const PALETTE = ["#ffd166", "#f4978e", "#caffbf", "#a0c4ff", "#ffadad", "#fdffb6", "#bde0fe", "#d0f4de"];

export function safe(v) {
  return v == null ? "" : String(v);
}

export function surname(n) {
  const s = safe(n).trim();
  if (!s) return "";
  if (s.includes(",")) return s.split(",")[0].trim();
  const parts = s.split(/\s+/);
  if (parts.length === 1) return s;
  if (parts.length === 2) return parts[1];
  return parts.slice(0, -1).join(" ");
}

export function parseTime(t) {
  const s = safe(t).trim();
  if (!s || s === "-" || /lap/i.test(s)) return null;
  const m = s.match(/^(\d+):([0-5]?\d(?:\.\d+)?)/);
  if (m) return parseInt(m[1], 10) * 60 + parseFloat(m[2]);
  const n = s.replace(/[^\d.]/g, "");
  if (!n) return null;
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : null;
}

export function fastestIndex(list) {
  let idx = -1;
  let best = Infinity;
  for (let i = 0; i < list.length; i++) {
    const v = parseTime(list[i]?.bestLap ?? list[i]?.lastLap);
    if (v != null && v < best) {
      best = v;
      idx = i;
    }
  }
  return idx;
}

export function idFor(r) {
  return `${safe(r.number)}|${safe(surname(r.name))}`;
}

export function formatTimer(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const t = Math.floor((ms % 1000) / 100);
  const p2 = (v) => (v < 10 ? `0${v}` : `${v}`);
  return m > 0 ? `${m}:${p2(s)}.${t}` : `${s}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`;
}

export function colorFor(numStr, nameStr) {
  const n = parseInt(safe(numStr), 10);
  const idx = Number.isFinite(n) ? n % PALETTE.length : Math.abs(safe(nameStr).charCodeAt(0) || 0) % PALETTE.length;
  return PALETTE[idx];
}
