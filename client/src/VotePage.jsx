import React, { useEffect, useState } from "react";
import { useMount, animate } from "react-ui-animate";
import { Award, CheckCircle2, AlertCircle } from "lucide-react";

export default function VotePage() {
  const [status, setStatus] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [voted, setVoted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentVoteId, setCurrentVoteId] = useState("");

  // Load voting status
  useEffect(() => {
    document.title = "VOTAR | StreamRace 1.0";
    async function load() {
      try {
        const apiOrigin = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiOrigin}/api/voting/status`);
        const data = await res.json();
        
        setStatus(data.active ? "active" : "closed");
        setCandidates(data.candidates || []);
        
        // Handle Vote ID for duplicate voting prevention
        const serverVoteId = data.voteId || "";
        setCurrentVoteId(serverVoteId);

        if (data.active && serverVoteId) {
           const localLastId = localStorage.getItem("lastVoteId");
           setVoted(localLastId === serverVoteId);
        } else {
           // If not active, we don't block based on 'voted', 
           // but the 'closed' status UI will take precedence anyway.
           // We can reset voted to false to be clean.
           setVoted(false);
        }

      } catch (e) {
        setStatus("error");
      } finally {
        setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 3000); // Poll status every 3s
    return () => clearInterval(t);
  }, []);

  async function handleVote(candidateNumber) {
    if (voted) return;
    setLoading(true);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/voting/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateNumber })
      });
      
      if (res.ok) {
        setVoted(true);
        if (currentVoteId) {
            localStorage.setItem("lastVoteId", currentVoteId);
        }
        setMessage("¡Gracias por tu voto!");
      } else {
        const d = await res.json();
        setMessage(d.error || "Error al votar");
      }
    } catch (e) {
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !candidates.length) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (status === "closed") {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Award className="w-16 h-16 text-[var(--accent)] mb-4 opacity-50" />
        <h1 className="text-2xl font-bold mb-2">Votación Cerrada</h1>
        <p className="text-neutral-400">La votación para el Piloto Destacado no está activa en este momento.</p>
      </div>
    );
  }

  if (voted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" />
        <h1 className="text-3xl font-bold mb-2">¡Voto Registrado!</h1>
        <p className="text-neutral-400 mb-8">Gracias por participar en la elección del Piloto Destacado.</p>
        
        {/* Live Results Preview */}
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-lg font-semibold text-left mb-4">Resultados Parciales</h2>
          {candidates.sort((a,b) => b.votes - a.votes).map(c => (
            <div key={c.number} className="relative group">
              <div className="flex justify-between items-end mb-1 text-sm">
                <span className="font-medium text-white/90">{c.name}</span>
                <span className="font-mono text-[var(--accent)]">{c.percent}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--accent)] transition-all duration-1000 ease-out"
                  style={{ width: `${c.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-black text-amber-500 mb-2 uppercase tracking-tight">Piloto Destacado</h1>
        <p className="text-neutral-400 text-sm">Selecciona a tu piloto favorito para votar.</p>
      </header>

      <div className="grid gap-4 max-w-md mx-auto">
        {candidates.map((c) => (
          <button
            key={c.number}
            onClick={() => handleVote(c.number)}
            disabled={loading}
            className="relative overflow-hidden group bg-neutral-900 border border-white/10 hover:border-amber-500/50 hover:bg-neutral-800 transition-all rounded-xl p-4 text-left flex items-center gap-4 active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center text-xl font-bold font-mono text-amber-500 border border-white/5 group-hover:border-amber-500/20 group-hover:bg-amber-500/10 transition-colors">
              {c.number}
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">{c.name}</div>
              <div className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-medium">Votar piloto</div>
            </div>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-amber-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </button>
        ))}
      </div>
      
      {message && (
        <div className="fixed bottom-6 left-6 right-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-center backdrop-blur-md">
          <AlertCircle className="w-5 h-5 inline-block mr-2 -mt-1" />
          {message}
        </div>
      )}
    </div>
  );
}
