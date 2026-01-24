import React, { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { animate, useMount } from "react-ui-animate";

export default function Announcements({ items }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (Array.isArray(items) && items.length > 0) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 8000); // Hide after 8 seconds
      return () => clearTimeout(t);
    }
  }, [items]);

  const hasItems = visible && Array.isArray(items) && items.length > 0;
  const list = hasItems ? items.slice(0, 1) : [];
  
  const mounted = useMount(hasItems, { from: 0, enter: 1, exit: 0 });

  return mounted((a, isMounted) => (
    isMounted && (
      <animate.div
        style={{
          opacity: a,
          scale: a.to([0, 1], [0.9, 1]),
          background: "#141414"
        }}
        className="rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.5)] h-[45px] flex items-center px-5 font-bold tracking-tight whitespace-nowrap border border-white/5"
      >
        <div className="flex items-center gap-3 text-white">
          <Megaphone className="text-[var(--accent)]" style={{ width: "1.2em", height: "1.2em" }} />
          {list.map((x, i) => (
            <div key={i} className="flex items-center text-nowrap gap-2 pr-4">
              {x.time && <span className="opacity-60">{x.time}</span>}
              <span className="uppercase italic">{x.text}</span>
            </div>
          ))}
        </div>
      </animate.div>
    )
  ));
}
