import React, { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { animate, useMount } from "react-ui-animate";
import { useAutoTranslation } from "./hooks/useAutoTranslation";

function AnnouncementItem({ item }) {
  // Use hook here so each item gets translated individually
  const translatedText = useAutoTranslation(item.text, 'es');

  return (
    <div className="flex items-center text-nowrap gap-2 pr-4">
      {item.time && <span className="opacity-60">{item.time}</span>}
      <span className="uppercase italic">{translatedText}</span>
    </div>
  );
}

export default function Announcements({ items }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (Array.isArray(items) && items.length > 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 8000); // Hide after 8 seconds
      return () => clearTimeout(timer);
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
        className="rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.5)] h-[54px] flex items-center px-6 font-bold tracking-tight whitespace-nowrap border border-white/5 text-xl"
      >
        <div className="flex items-center gap-4 text-white">
          <Megaphone className="text-[var(--accent)]" style={{ width: "1.2em", height: "1.2em" }} />
          {list.map((x, i) => (
            <AnnouncementItem key={i} item={x} />
          ))}
        </div>
      </animate.div>
    )
  ));
}
