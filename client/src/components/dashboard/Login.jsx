import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        onLogin(data.token);
      } else {
        setError("Credenciales incorrectas");
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center text-white">
      <form onSubmit={handleSubmit} className="bg-[#141414] p-8 rounded-xl border border-white/10 w-full max-w-sm space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
           <div className="w-12 h-12 bg-[var(--accent)] mx-auto transform -skew-x-12 mb-4" />
           <h1 className="text-2xl font-black italic uppercase">Admin Access</h1>
        </div>
        
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider opacity-60">Usuario</label>
           <input 
             type="text" 
             value={username}
             onChange={e => setUsername(e.target.value)}
             className="w-full px-4 py-3 rounded bg-black/40 border border-white/10 outline-none focus:border-[var(--accent)] transition-colors text-center tracking-widest text-lg"
             placeholder="admin"
           />
        </div>
        
        <div className="space-y-2">
           <label className="text-xs font-bold uppercase tracking-wider opacity-60">Password</label>
           <input 
             type="password" 
             value={password}
             onChange={e => setPassword(e.target.value)}
             className="w-full px-4 py-3 rounded bg-black/40 border border-white/10 outline-none focus:border-[var(--accent)] transition-colors text-center tracking-widest text-lg"
             autoFocus
             placeholder="••••••••"
           />
        </div>

        {error && <div className="text-red-500 text-sm font-bold text-center bg-red-500/10 py-2 rounded border border-red-500/20">{error}</div>}

        <button 
          disabled={loading}
          className="w-full py-3 bg-[var(--accent)] text-black font-bold uppercase italic tracking-wider rounded hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
