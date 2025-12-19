import React from "react";
import { Megaphone } from "lucide-react";

export default function Announcements({ items }) {
  const hasItems = Array.isArray(items) && items.length > 0;
  const list = hasItems ? items.slice(0, 3) : [];
  return (
    <div
      className="absolute left-full top-[110px] ml-3 rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm min-h-[45px] flex items-center px-5 font-bold tracking-tight whitespace-nowrap border border-white/10"
      style={{ background: "var(--panel)" }}
    >
      {hasItems ? (
        <div className="flex items-center gap-3 text-white">
          <Megaphone color="#ffd400" style={{ width: "1.2em", height: "1.2em" }} />
          {list.map((x, i) => (
            <div key={i} className="flex items-center text-nowrap gap-2 pr-4">
              {x.time && <span className="opacity-60">{x.time}</span>}
              <span className="uppercase italic">{x.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 text-white">
          <Megaphone color="#ffd400" style={{ width: "1.2em", height: "1.2em" }} />
          <span className="opacity-60 uppercase italic">Sin anuncios</span>
        </div>
      )}
    </div>
  );
}
