import React, { useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import Input from "../ui/Input.jsx";

export default function WeatherSearch({ onSelectLocation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearching(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=es&format=json`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Error searching location:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1">
          <Input 
            value={query} 
            onChange={setQuery} 
            placeholder="Buscar ciudad, circuito o lugar..." 
            className="w-full"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white transition-colors flex items-center justify-center"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </button>
      </form>

      {searching && (
        <div className="bg-black/20 rounded-lg border border-white/5 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
          {results.length === 0 && !loading ? (
            <div className="p-4 text-center text-white/30 text-sm">No se encontraron resultados</div>
          ) : (
            results.map((place) => (
              <button
                key={place.id}
                onClick={() => {
                  onSelectLocation({
                    name: place.name,
                    lat: place.latitude,
                    lng: place.longitude,
                    country: place.country,
                    admin1: place.admin1
                  });
                  setResults([]);
                  setQuery("");
                  setSearching(false);
                }}
                className="w-full text-left p-3 hover:bg-white/10 border-b border-white/5 last:border-0 flex items-center gap-3 transition-colors group"
              >
                <MapPin className="w-4 h-4 text-white/30 group-hover:text-[var(--accent)] transition-colors" />
                <div>
                  <div className="text-white font-bold text-sm">{place.name}</div>
                  <div className="text-white/50 text-xs">
                    {[place.admin1, place.country].filter(Boolean).join(", ")}
                  </div>
                </div>
                {place.country_code && (
                  <img 
                    src={`https://flagcdn.com/24x18/${place.country_code.toLowerCase()}.png`} 
                    alt={place.country_code}
                    className="ml-auto w-6 h-4 object-cover opacity-50 group-hover:opacity-100"
                  />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
