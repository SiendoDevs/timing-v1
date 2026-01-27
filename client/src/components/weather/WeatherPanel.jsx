import React, { useState, useEffect } from "react";
import { CloudSun, Save, RefreshCw, Trash2 } from "lucide-react";
import SectionHeader from "../ui/SectionHeader.jsx";
import WeatherWidget from "./WeatherWidget.jsx";
import WeatherSearch from "./WeatherSearch.jsx";

export default function WeatherPanel({ token }) {
  const [weatherConfig, setWeatherConfig] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Fetch weather when config changes
  useEffect(() => {
    if (weatherConfig?.lat && weatherConfig?.lng) {
      fetchWeather(weatherConfig.lat, weatherConfig.lng);
    }
  }, [weatherConfig]);

  async function loadConfig() {
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.weather) {
          setWeatherConfig(data.weather);
        }
      }
    } catch (e) {
      console.error("Error loading weather config", e);
    }
  }

  async function fetchWeather(lat, lng) {
    setLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day,cloud_cover&timezone=auto`);
      if (res.ok) {
        const data = await res.json();
        setWeatherData(data);
      }
    } catch (e) {
      console.error("Error fetching weather data", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLocation(location) {
    setSaving(true);
    try {
      const newConfig = {
        name: location.name,
        lat: location.lat,
        lng: location.lng,
        country: location.country,
        admin1: location.admin1,
        enabled: true
      };

      // Optimistic update
      setWeatherConfig(newConfig);

      const apiOrigin = import.meta.env.VITE_API_URL || "";
      await fetch(`${apiOrigin}/api/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ weather: newConfig })
      });
      
    } catch (e) {
      console.error("Error saving weather config", e);
      alert("Error al guardar la ubicación");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if(!confirm("¿Quitar el widget de clima?")) return;
    
    setSaving(true);
    try {
      setWeatherConfig(null);
      setWeatherData(null);
      
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      await fetch(`${apiOrigin}/api/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ weather: null })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    if (!weatherConfig) return;
    const newEnabled = !weatherConfig.enabled;
    const newConfig = { ...weatherConfig, enabled: newEnabled };
    
    setWeatherConfig(newConfig);
    
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      await fetch(`${apiOrigin}/api/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ weather: newConfig })
      });
    } catch (e) {
      console.error(e);
      // Revert on error
      setWeatherConfig({ ...weatherConfig, enabled: !newEnabled });
    }
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
           <div>
             <h2 className="text-2xl font-black italic uppercase">Clima en Vivo</h2>
             <p className="text-white/40 text-sm">Configura la ubicación para el widget de clima</p>
           </div>
           {weatherConfig && (
             <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-2 rounded border border-white/10 hover:bg-white/10 transition-colors select-none">
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${weatherConfig.enabled ? "bg-green-500" : "bg-white/20"}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${weatherConfig.enabled ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className={`text-xs font-bold uppercase ${weatherConfig.enabled ? "text-white" : "text-white/50"}`}>
                    {weatherConfig.enabled ? "Visible" : "Oculto"}
                  </span>
                  <input type="checkbox" className="hidden" checked={weatherConfig.enabled || false} onChange={toggleEnabled} />
                </label>
                <div className="w-px h-8 bg-white/10" />
                <button 
                  onClick={handleRemove}
                  className="px-3 py-2 bg-red-500/10 text-red-400 font-bold uppercase italic tracking-wider rounded text-xs hover:bg-red-500/20 border border-red-500/20 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> Quitar
                </button>
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Left: Search & Config */}
          <div className="bg-[#141414] p-4 rounded-xl border border-white/5 space-y-4">
            <SectionHeader title="Ubicación" icon={<CloudSun className="w-4 h-4 text-[var(--accent)]" />} />
            
            {weatherConfig ? (
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="text-xs text-white/40 uppercase font-bold mb-1">Ubicación Seleccionada</div>
                <div className="text-xl font-bold text-white mb-1">{weatherConfig.name}</div>
                <div className="text-sm text-white/60 mb-3">
                   {[weatherConfig.admin1, weatherConfig.country].filter(Boolean).join(", ")}
                </div>
                <button 
                  onClick={() => setWeatherConfig(null)}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Cambiar ubicación
                </button>
              </div>
            ) : (
              <WeatherSearch onSelectLocation={handleSaveLocation} />
            )}
          </div>

          {/* Right: Preview */}
          <div className="bg-[#141414] p-4 rounded-xl border border-white/5 space-y-4">
            <SectionHeader title="Vista Previa" icon={<RefreshCw className="w-4 h-4 text-[var(--accent)]" />} />
            
            <div className="flex items-center justify-center min-h-[200px] bg-black/20 rounded-lg border border-white/5 border-dashed">
              {loading ? (
                <div className="text-white/50 animate-pulse">Cargando datos...</div>
              ) : weatherConfig && weatherData ? (
                <div className="transform scale-90 sm:scale-100">
                   <WeatherWidget data={weatherData} locationName={weatherConfig.name} />
                </div>
              ) : (
                <div className="text-center p-6 text-white/20">
                  <CloudSun className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Selecciona una ubicación para ver el clima</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
