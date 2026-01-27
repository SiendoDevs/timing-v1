import React, { useState, useEffect, useRef } from "react";
import { Cloud, CloudRain, CloudSun, Sun, Wind, Droplets, Snowflake, CloudLightning, Thermometer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Weather codes mapping to Lucide icons
const getWeatherIcon = (code) => {
  if (code === 0) return <Sun className="w-full h-full text-yellow-400" />;
  if (code >= 1 && code <= 3) return <CloudSun className="w-full h-full text-gray-300" />;
  if (code >= 45 && code <= 48) return <Cloud className="w-full h-full text-gray-400" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-full h-full text-blue-400" />;
  if (code >= 71 && code <= 77) return <Snowflake className="w-full h-full text-white" />;
  if (code >= 80 && code <= 82) return <CloudRain className="w-full h-full text-blue-500" />;
  if (code >= 85 && code <= 86) return <Snowflake className="w-full h-full text-white" />;
  if (code >= 95) return <CloudLightning className="w-full h-full text-yellow-600" />;
  return <Cloud className="w-full h-full text-gray-400" />;
};

const getWeatherDescription = (code) => {
  const codes = {
    0: "Despejado",
    1: "Mayormente Despejado",
    2: "Parcialmente Nublado",
    3: "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna Ligera",
    53: "Llovizna Moderada",
    55: "Llovizna Intensa",
    61: "Lluvia Ligera",
    63: "Lluvia Moderada",
    65: "Lluvia Intensa",
    71: "Nieve Ligera",
    73: "Nieve Moderada",
    75: "Nieve Intensa",
    77: "Granizo",
    80: "Lluvia Fuerte",
    81: "Lluvia Muy Fuerte",
    82: "Lluvia Torrencial",
    95: "Tormenta",
    96: "Tormenta con Granizo",
    99: "Tormenta Fuerte"
  };
  return codes[code] || "Desconocido";
};

const ScrollingText = ({ text, className }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current && textRef.current) {
        setShouldScroll(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    checkWidth();
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden w-full relative ${className}`}>
      {shouldScroll ? (
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: Math.max(10, text.length * 0.4),
            ease: "linear",
            repeat: Infinity,
          }}
        >
          <span className="mr-8">{text}</span>
          <span className="mr-8">{text}</span>
        </motion.div>
      ) : (
        <span className="truncate block">{text}</span>
      )}
      <span 
        ref={textRef} 
        className="absolute top-0 left-0 opacity-0 pointer-events-none whitespace-nowrap"
        aria-hidden="true"
      >
        {text}
      </span>
    </div>
  );
};

export default function WeatherWidget({ data, locationName }) {
  const [mode, setMode] = useState("AIR"); // AIR | TRACK

  useEffect(() => {
    const timer = setInterval(() => {
      setMode(prev => prev === "AIR" ? "TRACK" : "AIR");
    }, 8000); // 8 seconds cycle
    return () => clearInterval(timer);
  }, []);

  if (!data) return <div className="text-white/30 text-center text-sm italic">Sin datos de clima</div>;

  const current = data.current;
  
  // Track Temp Calculation
  const airTemp = current.temperature_2m;
  const wind = current.wind_speed_10m;
  const cloudCover = current.cloud_cover || 0;
  const isDay = current.is_day !== 0;

  let trackOffset = 0;
  if (isDay) {
     // Sun factor: 0 (overcast) to 1 (clear)
     const sunFactor = (100 - cloudCover) / 100;
     // Max heating +15C, Min +2C
     trackOffset = (sunFactor * 13) + 2;
  } else {
     // Night: track cools down
     trackOffset = -1;
  }
  // Wind cooling: -0.2C per km/h
  trackOffset -= (wind * 0.2);
  
  const trackTemp = Math.round(airTemp + trackOffset);

  return (
    <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-6 text-white w-[360px] shadow-2xl relative overflow-hidden">
       {/* Background accent */}
       <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${mode === "AIR" ? "bg-blue-500" : "bg-red-500"}`} />

       <AnimatePresence mode="wait">
         {mode === "AIR" ? (
            <motion.div 
               key="AIR"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.5 }}
               className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="w-16 h-16 shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                {getWeatherIcon(current.weather_code)}
              </div>
              
              <div className="flex-1 min-w-0">
                <ScrollingText 
                  text={locationName} 
                  className="text-sm font-bold uppercase text-[var(--accent)] tracking-wider mb-1"
                />
                <div className="text-4xl font-black italic tabular-nums leading-none mb-1">
                  {airTemp}<span className="text-lg align-top">°C</span>
                </div>
                <ScrollingText 
                  text={getWeatherDescription(current.weather_code)} 
                  className="text-xs text-white/60 font-medium uppercase tracking-wide"
                />
              </div>
            </motion.div>
         ) : (
            <motion.div 
               key="TRACK"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.5 }}
               className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="w-16 h-16 shrink-0 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)] text-red-500 flex items-center justify-center">
                 <Thermometer className="w-full h-full" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold uppercase text-red-400 tracking-wider mb-1 truncate">Temp. Pista</div>
                <div className="text-4xl font-black italic tabular-nums leading-none mb-1 text-white">
                  {trackTemp}<span className="text-lg align-top">°C</span>
                </div>
                <div className="text-xs text-white/60 font-medium uppercase tracking-wide truncate">
                  Estimada
                </div>
              </div>
            </motion.div>
         )}
       </AnimatePresence>

      <div className="flex flex-col gap-2 border-l border-white/10 pl-5 pr-1 z-10 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-white/90" title="Humedad">
          <Droplets className="w-5 h-5 text-blue-400" />
          <span>{current.relative_humidity_2m}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-white/90" title="Viento">
          <Wind className="w-5 h-5 text-gray-400" />
          <span>{current.wind_speed_10m} km/h</span>
        </div>
      </div>
    </div>
  );
}
