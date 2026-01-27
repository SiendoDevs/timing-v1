import React, { useEffect, useState, useRef } from "react";

const FLAG_BANNERS = {
  YELLOW: { text: "BANDERA AMARILLA", class: "bg-yellow-500 text-black animate-pulse" },
  RED: { text: "BANDERA ROJA", class: "bg-red-600 text-white animate-pulse" },
  SC: { text: "SAFETY CAR", class: "bg-orange-500 text-black animate-pulse" },
  VSC: { text: "VIRTUAL SAFETY CAR", class: "bg-orange-500 text-black animate-pulse" },
  SLOW: { text: "SLOW", class: "bg-orange-500 text-black animate-pulse" },
  BLUE: { text: "BANDERA AZUL", class: "bg-blue-600 text-white animate-pulse" },
  WHITE: { text: "BANDERA BLANCA", class: "bg-white text-black animate-pulse" },
  FINISH: { text: "CARRERA FINALIZADA", class: "bg-white text-black" },
  GREEN: { text: "BANDERA VERDE", class: "bg-green-500 text-black" }
};

export default function FlagBanner({ raceFlag }) {
  const [showGreenBanner, setShowGreenBanner] = useState(false);
  const prevRaceFlag = useRef(raceFlag);
  
  // Logic to show GREEN banner for 5 seconds
  useEffect(() => {
    if (raceFlag === "GREEN") {
      const prev = String(prevRaceFlag.current || "");
      const wasSpecial = prev.startsWith("BLACK") || prev.startsWith("MEATBALL") || prev.startsWith("PENALTY");
      if (!wasSpecial) {
        setShowGreenBanner(true);
        const t = setTimeout(() => setShowGreenBanner(false), 5000);
        return () => clearTimeout(t);
      } else {
        setShowGreenBanner(false);
      }
    } else {
      setShowGreenBanner(false);
    }
    prevRaceFlag.current = raceFlag;
  }, [raceFlag]);

  let activeBanner = null;

  if (raceFlag && raceFlag.startsWith("BLACK")) {
     const parts = raceFlag.split(":");
     const num = parts[1] || "";
     activeBanner = { 
        text: num ? `BANDERA NEGRA #${num}` : "BANDERA NEGRA", 
        class: "bg-black text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse" 
     };
  } else if (raceFlag && raceFlag.startsWith("MEATBALL")) {
     const parts = raceFlag.split(":");
     const num = parts[1] || "";
     activeBanner = { 
        text: num ? `REPARACIÓN #${num}` : "REPARACIÓN", 
        class: "bg-black text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)] animate-pulse",
        icon: <div className="w-5 h-5 rounded-full bg-orange-500 border-2 border-black ring-1 ring-orange-500 shrink-0" />
     };
  } else if (raceFlag && raceFlag.startsWith("PENALTY")) {
     const parts = raceFlag.split(":");
     const num = parts[1] || "";
     const time = parts[2] || "";
     activeBanner = { 
        text: `SANCIÓN #${num} ${time ? `(${time})` : ""}`,
        class: "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.5)] animate-pulse",
        icon: <div className="w-8 h-8 border border-black shadow-sm" style={{ background: "linear-gradient(to bottom right, black 50%, white 50%)" }} />
     };
  } else {
     activeBanner = FLAG_BANNERS[raceFlag];
  }

  // Only show GREEN banner if temporary state is true
  if (raceFlag === "GREEN" && !showGreenBanner) {
    activeBanner = null;
  }

  // To animate height/opacity
  const [bannerContent, setBannerContent] = useState(activeBanner);
  useEffect(() => {
    if (activeBanner) setBannerContent(activeBanner);
  }, [activeBanner]);

  return (
    <div
      className={`w-full overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10 ${
        activeBanner ? "max-h-[60px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-[60px]"
      }`}
    >
       {bannerContent && (
         <div 
            className={`w-full py-2 font-black text-center text-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 ${bannerContent.class}`}
            style={bannerContent.style || {}}
         >
            {bannerContent.icon}
            <span className={bannerContent.textClass || ""}>{bannerContent.text}</span>
         </div>
       )}
    </div>
  );
}
