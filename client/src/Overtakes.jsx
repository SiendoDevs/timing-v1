import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { animate, useMount } from "react-ui-animate";

export default function Overtakes({ badge, who, gain }) {
  const g = typeof gain === "number" && Number.isFinite(gain) ? gain : 0;
  const [visible, setVisible] = useState(false);
  const [lastBadge, setLastBadge] = useState(null);

  useEffect(() => {
    if (g > 0 && badge !== lastBadge) {
      setVisible(true);
      setLastBadge(badge);
      const t = setTimeout(() => setVisible(false), 8000); // Hide after 8 seconds
      return () => clearTimeout(t);
    }
  }, [g, badge, lastBadge]);

  const show = visible && g > 0;
  
  const mounted = useMount(show, { from: 0, enter: 1, exit: 0 });

  return mounted((a, isMounted) => (
    isMounted && (
      <animate.div
        style={{
           opacity: a,
           scale: a.to([0, 1], [0.9, 1]),
           background: "var(--panel)"
        }}
        className="rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm h-[45px] flex items-center px-5 font-bold tracking-tight whitespace-nowrap border border-white/10"
      >
        <div className="relative z-10 uppercase italic text-[18px] duration-300 drop-shadow-md text-white flex items-center gap-3">
          <TrendingUp color="#4ade80" style={{ width: "1.2em", height: "1.2em" }} />
          <span className="text-white/80">ADELANTAMIENTOS:</span>
          <span className="text-[#4ade80]">+{g}</span>
          <span className="text-black rounded-md font-extrabold px-2 py-0.5 min-w-[36px]" style={{ background: "#ffd166" }}>{badge || ""}</span>
          <span className="italic font-extrabold text-white">{who || ""}</span>
        </div>
      </animate.div>
    )
  ));
}
