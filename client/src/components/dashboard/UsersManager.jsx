import React, { useState, useEffect } from "react";
import { User, X } from "lucide-react";

export default function UsersManager({ token, onClose }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function addUser(e) {
    e.preventDefault();
    if (!newUser || !newPass) return;
    setLoading(true);
    setError("");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/users`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ username: newUser, password: newPass })
      });
      if (res.ok) {
        setNewUser("");
        setNewPass("");
        fetchUsers();
      } else {
        const d = await res.json();
        setError(d.error || "Error al crear usuario");
      }
    } catch (e) {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(username) {
    if (!confirm(`¿Eliminar usuario ${username}?`)) return;
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/users/${username}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("No se pudo eliminar");
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-white">
      <div className="bg-[#141414] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black italic mb-6 uppercase flex items-center gap-2">
          <User className="w-6 h-6 text-[var(--accent)]" /> Gestión de Usuarios
        </h2>
        
        <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2">
          {users.map(u => (
            <div key={u.username} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
              <div className="font-mono">
                <span className="font-bold text-white">{u.username}</span>
                {u.role === 'admin' && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-500 px-1 rounded">ADMIN</span>}
              </div>
              {u.username !== 'admin' && (
                <button onClick={() => deleteUser(u.username)} className="text-red-400 hover:text-red-300 text-xs uppercase font-bold">
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={addUser} className="space-y-4 border-t border-white/10 pt-6">
          <h3 className="text-sm font-bold text-white/50 uppercase">Agregar Usuario</h3>
          <input 
            value={newUser} onChange={e => setNewUser(e.target.value)}
            placeholder="Nombre de usuario"
            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm outline-none focus:border-[var(--accent)] text-white"
          />
          <input 
            type="password"
            value={newPass} onChange={e => setNewPass(e.target.value)}
            placeholder="Contraseña"
            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm outline-none focus:border-[var(--accent)] text-white"
          />
          {error && <div className="text-red-400 text-xs font-bold text-center">{error}</div>}
          <button disabled={loading} className="w-full py-2 bg-[var(--accent)] text-black font-bold uppercase text-sm rounded hover:brightness-110">
            {loading ? "Creando..." : "Crear Usuario"}
          </button>
        </form>
      </div>
    </div>
  );
}
