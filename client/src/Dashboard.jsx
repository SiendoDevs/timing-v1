import React, { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  Tv, 
  Library, 
  Save, 
  Trash2, 
  Map as MapIcon, 
  Flag, 
  Timer, 
  Calendar, 
  User,
  Info,
  X,
  Radio,
  Server,
  Award,
  ListChecks,
  Check,
  Wifi,
  Upload as UploadIcon
} from "lucide-react";

// --- Components ---

function Login({ onLogin }) {
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

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block w-full">
      <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1.5">{label}</div>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded bg-black/40 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm font-mono transition-all"
      />
    </label>
  );
}

function SectionHeader({ title, color = "var(--accent)", icon, status }) {
  return (
    <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
      <div className="w-1.5 h-4 -skew-x-12" style={{ background: color }} />
      <div className="font-black italic uppercase tracking-tight text-lg">{title}</div>
      {status && <div className="ml-auto text-xs font-mono text-white/60 truncate max-w-[200px] animate-pulse">{status}</div>}
      {icon && <div className={`${status ? "ml-3" : "ml-auto"} opacity-50`}>{icon}</div>}
    </div>
  );
}

function StatusBadge({ active, labelActive, labelInactive }) {
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
      active 
        ? "bg-green-500/10 border-green-500/20 text-green-400" 
        : "bg-red-500/10 border-red-500/20 text-red-400"
    }`}>
      {active ? labelActive : labelInactive}
    </span>
  );
}

function ActionButton({ onClick, disabled, active, label, activeLabel, type = "normal", icon }) {
  let baseClass = "w-full px-4 py-3 font-bold uppercase italic tracking-wider rounded text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const types = {
    normal: active 
      ? "bg-white/10 text-white border border-white/10 hover:bg-white/20"
      : "bg-[var(--accent)] text-black border border-transparent hover:brightness-110",
    danger: active
      ? "bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30"
      : "bg-green-500/20 text-green-200 border border-green-500/30 hover:bg-green-500/30",
    link: "bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono"
  };

  const currentLabel = active && activeLabel ? activeLabel : label;

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClass} ${types[type]}`}>
      {icon && <span>{icon}</span>}
      {currentLabel}
    </button>
  );
}

function UsersManager({ token, onClose }) {
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



function CircuitInfo({ token }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  
  const [id, setId] = useState(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [length, setLength] = useState("");
  const [turns, setTurns] = useState("");
  const [recordTime, setRecordTime] = useState("");
  const [recordDriver, setRecordDriver] = useState("");
  const [recordYear, setRecordYear] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Library State
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryCircuits, setLibraryCircuits] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  useEffect(() => {
    loadCircuit();
  }, []);

  useEffect(() => {
    if (libraryOpen) {
      fetchLibrary();
    }
  }, [libraryOpen]);

  async function fetchLibrary() {
    setLibraryLoading(true);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/circuits`);
      if (res.ok) {
        setLibraryCircuits(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLibraryLoading(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "image/png") {
      alert("Solo se permiten imágenes PNG.");
      return;
    }

    if (file.size > 1024 * 1024) {
      alert("La imagen no puede superar 1MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Upload successful:", data);
        if (data.url) {
          setMapUrl(data.url);
        } else {
          alert("Error: La respuesta del servidor no contiene la URL de la imagen.");
        }
      } else {
        const err = await res.json();
        alert("Error al subir imagen: " + (err.error || "Desconocido"));
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al subir imagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveToLibrary() {
    if (!name) return alert("El nombre del circuito es obligatorio para guardar en la biblioteca.");
    if (!confirm("¿Guardar este circuito en la biblioteca?")) return;
    
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/circuits`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id, name, location, length, turns, recordTime, recordDriver, recordYear, mapUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryCircuits(data.library);
        if (data.savedCircuit?.id) {
          setId(data.savedCircuit.id);
        }
        alert("Circuito guardado en biblioteca exitosamente.");
      } else {
        alert("Error al guardar en biblioteca.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al guardar en biblioteca.");
    }
  }

  async function deleteFromLibrary(id, e) {
    e.stopPropagation();
    if (!confirm("¿Eliminar este circuito de la biblioteca permanentemente?")) return;
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/circuits/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryCircuits(data.library);
      } else {
        alert("Error al eliminar.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al eliminar.");
    }
  }

  function loadFromLibrary(c) {
    if (!confirm(`¿Cargar los datos del circuito "${c.name}"?\nSe reemplazarán los datos actuales no guardados.`)) return;
    setId(c.id || null);
    setName(c.name || "");
    setLocation(c.location || "");
    setLength(c.length || "");
    setTurns(c.turns || "");
    setRecordTime(c.recordTime || "");
    setRecordDriver(c.recordDriver || "");
    setRecordYear(c.recordYear || "");
    setMapUrl(c.mapUrl || "");
    setLibraryOpen(false);
    setStatus("Datos cargados desde biblioteca (No olvides 'Guardar Cambios' para aplicar)");
    setTimeout(() => setStatus(""), 5000);
  }

  async function loadCircuit() {
    setLoading(true);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/circuit`);
      if (res.ok) {
        const data = await res.json();
        setId(data.id || null);
        setName(data.name || "");
        setLocation(data.location || "");
        setLength(data.length || "");
        setTurns(data.turns || "");
        setRecordTime(data.recordTime || "");
        setRecordDriver(data.recordDriver || "");
        setRecordYear(data.recordYear || "");
        setMapUrl(data.mapUrl || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveCircuit() {
    setSaving(true);
    setStatus("");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/circuit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id, name, location, length, turns, recordTime, recordDriver, recordYear, mapUrl
        })
      });
      
      if (res.ok) {
        setStatus("Información guardada correctamente");
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus("Error al guardar");
      }
    } catch (e) {
      setStatus("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-white/20">Cargando info del circuito...</div>;
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
           <div>
             <h2 className="text-2xl font-black italic uppercase">Información del Circuito</h2>
             <p className="text-white/40 text-sm">Gestiona los datos del trazado actual</p>
           </div>
           <div className="flex items-center gap-3">
             <button 
                onClick={() => window.open("/track", "_blank")}
                className="px-4 py-3 bg-white/10 text-white font-bold uppercase italic tracking-wider rounded text-sm hover:bg-white/20 border border-white/10 flex items-center gap-2"
             >
                <Tv className="w-4 h-4" /> Abrir Overlay
             </button>
             <button 
                onClick={() => setLibraryOpen(true)}
                className="px-4 py-3 bg-[var(--accent)]/10 text-[var(--accent)] font-bold uppercase italic tracking-wider rounded text-sm hover:bg-[var(--accent)]/20 border border-[var(--accent)]/20 flex items-center gap-2"
             >
                <Library className="w-4 h-4" /> Biblioteca
             </button>
             <div className="w-48">
               <ActionButton 
                 onClick={saveCircuit} 
                 disabled={saving} 
                 label={saving ? "Guardando..." : "Guardar Cambios"} 
                 type="normal"
                 active={false}
               />
             </div>
           </div>
        </div>

        {status && (
          <div className={`p-3 rounded border ${status.includes("Error") ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"} text-sm font-bold text-center`}>
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Info */}
          <div className="bg-[#141414] p-6 rounded-xl border border-white/5 space-y-4">
            <SectionHeader title="Datos Generales" icon={<Flag className="w-5 h-5 text-[var(--accent)]" />} />
            <Input label="Nombre del Circuito" value={name} onChange={setName} placeholder="Ej: Autódromo Oscar y Juan Gálvez" />
            <Input label="Ubicación" value={location} onChange={setLocation} placeholder="Ej: Buenos Aires, Argentina" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Longitud (km/m)" value={length} onChange={setLength} placeholder="Ej: 4.2 km" />
              <Input label="Curvas" value={turns} onChange={setTurns} placeholder="Ej: 12" />
            </div>
          </div>

          {/* Record Info */}
          <div className="bg-[#141414] p-6 rounded-xl border border-white/5 space-y-4">
            <SectionHeader title="Récord de Vuelta" icon={<Timer className="w-5 h-5 text-[var(--accent)]" />} />
            <Input label="Tiempo Récord" value={recordTime} onChange={setRecordTime} placeholder="Ej: 1:32.456" />
            <Input label="Piloto" value={recordDriver} onChange={setRecordDriver} placeholder="Ej: Juan Manuel Fangio" />
            <Input label="Año" value={recordYear} onChange={setRecordYear} placeholder="Ej: 2023" />
          </div>

          {/* Map / Image */}
          <div className="col-span-1 md:col-span-2 bg-[#141414] p-6 rounded-xl border border-white/5 space-y-4">
            <SectionHeader title="Mapa del Circuito" icon={<MapIcon className="w-5 h-5 text-[var(--accent)]" />} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="md:col-span-2 space-y-4">
                  <Input label="URL de la Imagen" value={mapUrl} onChange={setMapUrl} placeholder="https://..." />
                  
                  <div className="flex gap-3">
                     <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/png"
                        className="hidden"
                     />
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold uppercase text-xs rounded transition-colors flex items-center justify-center gap-2"
                        title="Subir imagen PNG (max 1MB)"
                     >
                        {uploading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : <UploadIcon className="w-4 h-4" />}
                        {uploading ? "Subiendo..." : "Subir PNG"}
                     </button>

                     <button 
                        onClick={saveToLibrary}
                        className="flex-1 px-4 py-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 text-[var(--accent)] font-bold uppercase text-xs rounded transition-colors flex items-center justify-center gap-2"
                        title="Guardar configuración actual en biblioteca"
                     >
                        <Save className="w-4 h-4" /> Guardar en Bibl.
                     </button>
                  </div>
               </div>

               <div className="md:col-span-1">
                  <div className="h-full min-h-[150px] bg-black/40 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                     {mapUrl ? (
                        <img 
                           src={mapUrl} 
                           alt="Mapa" 
                           className="max-w-full max-h-[120px] object-contain p-2" 
                        />
                     ) : (
                        <div className="text-center text-white/20 p-4">
                           <MapIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                           <span className="text-xs uppercase font-bold block">Vista Previa</span>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        </div>

      </div>

      {/* Library Modal */}
      {libraryOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                <Library className="w-6 h-6 text-[var(--accent)]" /> Biblioteca de Circuitos
              </h3>
              <button onClick={() => setLibraryOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {libraryLoading && <div className="text-center text-white/30 py-4">Cargando biblioteca...</div>}
              
              {!libraryLoading && libraryCircuits.length === 0 && (
                <div className="text-center text-white/30 py-8 border border-dashed border-white/10 rounded-lg">
                  La biblioteca está vacía.<br/>Guarda el circuito actual para verlo aquí.
                </div>
              )}

              {libraryCircuits.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => loadFromLibrary(c)}
                  className="group flex items-center justify-between p-4 bg-black/40 border border-white/5 hover:border-[var(--accent)] hover:bg-white/5 rounded-lg cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-4">
                    {c.mapUrl ? (
                      <img src={c.mapUrl} alt="" className="w-20 h-20 object-contain p-2 rounded bg-black/50" onError={e => e.target.style.display = 'none'} />
                    ) : (
                      <div className="w-12 h-12 bg-white/5 rounded flex items-center justify-center text-xl">
                        <Flag className="w-6 h-6 text-white/20" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-lg text-white group-hover:text-[var(--accent)]">{c.name}</div>
                      <div className="text-xs text-white/50 font-mono flex flex-wrap gap-2 mt-1">
                        {c.location && <span className="flex items-center gap-1"><MapIcon className="w-3 h-3" /> {c.location}</span>}
                        {c.length && <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> {c.length}</span>}
                        {c.turns && <span className="flex items-center gap-1"><Info className="w-3 h-3" /> {c.turns} curvas</span>}
                      </div>
                      {(c.recordTime || c.recordDriver) && (
                        <div className="text-xs text-[var(--accent)]/70 mt-1 flex items-center gap-1">
                           <Timer className="w-3 h-3" /> {c.recordTime} ({c.recordDriver})
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => deleteFromLibrary(c.id, e)}
                    className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    title="Eliminar de biblioteca"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/20 text-center text-xs text-white/30">
              Selecciona un circuito para cargar sus datos.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function Dashboard() {
  // Auth State
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const [showUsers, setShowUsers] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // State
  const [url, setUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [scrapingEnabled, setScrapingEnabled] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [votingWidgetEnabled, setVotingWidgetEnabled] = useState(true);
  const [overtakesEnabled, setOvertakesEnabled] = useState(true);
  const [currentLapEnabled, setCurrentLapEnabled] = useState(true);
  const [fastestLapEnabled, setFastestLapEnabled] = useState(true);
  const [lapFinishEnabled, setLapFinishEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [debug, setDebug] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [fullData, setFullData] = useState(null);
  const [updateDuration, setUpdateDuration] = useState(null);
  const [raceFlag, setRaceFlag] = useState("GREEN");
  const [blackFlagNum, setBlackFlagNum] = useState("");
  
  const savingRef = useRef(false);
  useEffect(() => { savingRef.current = saving; }, [saving]);

  // Voting State
  const [votingActive, setVotingActive] = useState(false);
  const [votingCandidates, setVotingCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [voteStats, setVoteStats] = useState({ totalVotes: 0, candidates: [] });

  // Effects & Logic
  
  function logout() {
    setToken(null);
    localStorage.removeItem("admin_token");
  }

  function handleLogin(newToken) {
    setToken(newToken);
    localStorage.setItem("admin_token", newToken);
  }

  useEffect(() => {
    if (!token) return;
    const apiOrigin = import.meta.env.VITE_API_URL || "";
    const fetchLoop = async () => {
      try {
        const t0 = performance.now();
        const res = await fetch(`${apiOrigin}/api/standings`);
        const data = await res.json();
        setUpdateDuration(Math.round(performance.now() - t0));
        
        if (data) {
          if (data.updatedAt) setLastUpdated(data.updatedAt);
          if (data.sessionName) setSessionName(data.sessionName);
          if (data.raceFlag) setRaceFlag(data.raceFlag);
          if (Array.isArray(data.standings)) {
            setPreviewRows(data.standings.slice(0, 12));
            setFullData(data);
          }
        }

        const vRes = await fetch(`${apiOrigin}/api/voting/status`);
        if (vRes.ok) {
          const vData = await vRes.json();
          setVotingActive(vData.active);
          setVoteStats({ totalVotes: vData.totalVotes, candidates: vData.candidates || [] });
          if (vData.active && vData.candidates) setVotingCandidates(vData.candidates);
        }
      } catch (e) { console.error("Loop error", e); }
    };
    const interval = setInterval(fetchLoop, 1000);
    fetchLoop();
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    document.title = `DASHBOARD | StreamRace ${__APP_VERSION__}`;
    loadConfig(true);  
    const interval = setInterval(() => {
      if (!savingRef.current) {
        loadConfig(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (raceFlag && raceFlag.startsWith("BLACK:")) {
      const parts = raceFlag.split(":");
      if (parts[1]) setBlackFlagNum(parts[1]);
    }
  }, [raceFlag]);

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  async function loadConfig(isInitial = false) {
    const apiOrigin = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${apiOrigin}/api/config`);
    const data = await res.json();
    
    // Fix: Only update text fields on initial load to prevent overwriting user input while typing
    if (isInitial) {
      setUrl(data.speedhiveUrl || "");
      setPublicUrl(data.publicUrl || "");
    }
    
    setOverlayEnabled(data.overlayEnabled !== false);
    setScrapingEnabled(data.scrapingEnabled !== false);
    setCommentsEnabled(data.commentsEnabled !== false);
    setVotingWidgetEnabled(data.votingWidgetEnabled !== false);
    setOvertakesEnabled(data.overtakesEnabled !== false);
    setCurrentLapEnabled(data.currentLapEnabled !== false);
    setFastestLapEnabled(data.fastestLapEnabled !== false);
    setLapFinishEnabled(data.lapFinishEnabled !== false);
    if (data.raceFlag) setRaceFlag(data.raceFlag);
  }

  async function saveConfig(updates = {}) {
    setSaving(true);
    setStatus("");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const initialData = (fullData && fullData.source === url) ? fullData : null;
      
      const body = { 
        speedhiveUrl: url,
        publicUrl, 
        overlayEnabled, 
        scrapingEnabled, 
        commentsEnabled, 
        votingWidgetEnabled,
        overtakesEnabled,
        currentLapEnabled,
        fastestLapEnabled,
        lapFinishEnabled,
        initialData,
        ...updates 
      };

      const res = await fetch(`${apiOrigin}/api/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      
      // Update local state based on what was saved
      if (updates.overlayEnabled !== undefined) setOverlayEnabled(data.overlayEnabled);
      if (updates.scrapingEnabled !== undefined) setScrapingEnabled(data.scrapingEnabled);
      if (updates.commentsEnabled !== undefined) setCommentsEnabled(data.commentsEnabled);
      if (updates.votingWidgetEnabled !== undefined) setVotingWidgetEnabled(data.votingWidgetEnabled);
      if (updates.overtakesEnabled !== undefined) setOvertakesEnabled(data.overtakesEnabled);
      if (updates.currentLapEnabled !== undefined) setCurrentLapEnabled(data.currentLapEnabled);
      if (updates.fastestLapEnabled !== undefined) setFastestLapEnabled(data.fastestLapEnabled);
      if (updates.lapFinishEnabled !== undefined) setLapFinishEnabled(data.lapFinishEnabled);
      
      setStatus("Configuración guardada");
    } catch (e) {
      setStatus(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function probar() {
    setStatus("Probando…");
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/standings?debug=1&force=1&url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setLastUpdated(data.updatedAt || Date.now());
      setSessionName(data.sessionName || "");
      setDebug(data.debug || null);
      setPreviewRows(Array.isArray(data.standings) ? data.standings.slice(0, 12) : []);
      setFullData(data);
      setStatus("OK - Datos recibidos");
    } catch (e) {
      setStatus("Error al probar conexión");
    }
  }

  async function startVoting() {
    if (selectedCandidates.length < 2) return setStatus("Selecciona al menos 2 pilotos");
    setSaving(true);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/voting/start`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ candidates: selectedCandidates })
      });
      
      if (res.status === 401) { logout(); return; }

      setVotingActive(true);
      setVotingCandidates(selectedCandidates);
      setStatus("Votación iniciada");
    } catch (e) { setStatus(String(e)); } 
    finally { setSaving(false); }
  }

  async function stopVoting() {
    setSaving(true);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/voting/stop`, { 
        method: "POST", 
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.status === 401) { logout(); return; }

      // If finished with 0 votes, clear selection
      if (voteStats.totalVotes === 0) {
        setSelectedCandidates([]);
      }

      setVotingActive(false);
      setStatus("Votación finalizada");
    } catch (e) { setStatus(String(e)); } 
    finally { setSaving(false); }
  }

  function toggleCandidate(row) {
    if (votingActive) return; 
    setSelectedCandidates(prev => {
      const exists = prev.find(c => c.number === row.number);
      return exists ? prev.filter(c => c.number !== row.number) : [...prev, { number: row.number, name: row.name }];
    });
  }

  async function updateFlag(flag) {
    // Toggle logic: if clicking the same flag (and it's not GREEN), revert to GREEN
    let target = flag;
    if (flag !== "GREEN" && raceFlag === flag) {
      target = "GREEN";
    }

    setRaceFlag(target);
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/flag`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ flag: target })
      });
      if (res.status === 401) logout();
    } catch (e) { console.error(e); }
  }

  // --- Render ---

  return (
    <div className="h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-[var(--accent)] selection:text-black overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md z-30">
        <div className="w-full px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[var(--accent)] transform -skew-x-12" />
            <div className="font-black tracking-tighter text-xl text-white italic">STREAMRACE {__APP_VERSION__}</div>
          </div>
          
          <div className="h-6 w-px bg-white/10" />

          {/* Navigation */}
          <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-1.5 rounded-md text-sm font-bold uppercase transition-all ${
                activeTab === "dashboard"
                  ? "bg-[var(--accent)] text-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("circuit")}
              className={`px-4 py-1.5 rounded-md text-sm font-bold uppercase transition-all ${
                activeTab === "circuit"
                  ? "bg-[var(--accent)] text-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Info Circuito
            </button>
          </nav>
          
          <div className="h-6 w-px bg-white/10" />
          
          <div className="flex items-center gap-3">
             {sessionName ? (
               <div className="text-white font-bold tracking-wide uppercase">{sessionName}</div>
             ) : (
               <div className="text-white/30 font-mono text-sm">SIN SESIÓN</div>
             )}
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs font-mono">
             {status && <div className="text-white/60 uppercase tracking-wider animate-pulse mr-4">{status}</div>}
             <button onClick={() => setShowUsers(true)} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded hover:bg-blue-500/20 transition-all font-bold uppercase mr-2">
                Usuarios
             </button>
             <button onClick={logout} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded hover:bg-red-500/20 transition-all font-bold uppercase">
                Salir
             </button>
             <button 
                onClick={() => saveConfig({ scrapingEnabled: !scrapingEnabled })}
                className={`px-3 py-1 rounded font-bold uppercase transition-all border ${
                  scrapingEnabled 
                    ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20" 
                    : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                }`}
              >
                {scrapingEnabled ? "SCRAPING ACTIVO" : "SCRAPING PAUSADO"}
             </button>

             <div className={`px-2 py-1 rounded flex items-center gap-2 border ${updateDuration > 500 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${updateDuration > 500 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                LATENCIA: {updateDuration || 0}ms
             </div>
             {lastUpdated && <div className="text-white/40">{new Date(lastUpdated).toLocaleTimeString()}</div>}
          </div>
        </div>
      </div>

      {activeTab === "dashboard" ? (
      <div className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left Column: Config (3 cols) */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Connection Card */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl shrink-0">
            <SectionHeader title="Fuente de Datos" icon={<Radio className="w-5 h-5 text-[var(--accent)]" />} status={status} />
            <div className="p-4 space-y-4">
              <Input
                label="Speedhive URL"
                value={url}
                onChange={setUrl}
                placeholder="https://speedhive.mylaps.com/..."
              />
              {/* <Input
                label="URL Pública de Votación (Opcional)"
                value={publicUrl}
                onChange={setPublicUrl}
                placeholder="https://tudominio.com (para QR)"
              /> */}
              <div className="grid grid-cols-2 gap-3">
                 <ActionButton onClick={() => saveConfig()} disabled={saving} label="Guardar" type="normal" />
                 <ActionButton onClick={probar} label="Probar" type="link" />
              </div>
            </div>
          </div>

          {/* Visibility Controls */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl shrink-0">
            <SectionHeader title="Transmisión" icon={<Tv className="w-5 h-5 text-[var(--accent)]" />} />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Overlay Principal</div>
                <button onClick={() => saveConfig({ overlayEnabled: !overlayEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${overlayEnabled ? "bg-green-500" : "bg-white/10"}`}>
                   <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${overlayEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Comentarios AI</div>
                <button onClick={() => saveConfig({ commentsEnabled: !commentsEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${commentsEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${commentsEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Widget Votación</div>
                <button onClick={() => saveConfig({ votingWidgetEnabled: !votingWidgetEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${votingWidgetEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${votingWidgetEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Vueltas</div>
                <button onClick={() => saveConfig({ currentLapEnabled: !currentLapEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${currentLapEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${currentLapEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Adelantamientos</div>
                <button onClick={() => saveConfig({ overtakesEnabled: !overtakesEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${overtakesEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${overtakesEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Récord de Vuelta</div>
                <button onClick={() => saveConfig({ fastestLapEnabled: !fastestLapEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${fastestLapEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${fastestLapEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
                <div className="font-bold text-xs uppercase">Final de Vuelta</div>
                <button onClick={() => saveConfig({ lapFinishEnabled: !lapFinishEnabled })} className={`w-10 h-5 rounded-full transition-colors relative ${lapFinishEnabled ? "bg-green-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${lapFinishEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="pt-2 border-t border-white/5">
                 <div className="font-bold text-[10px] text-white/40 uppercase mb-2 text-center">Overlays</div>
                 <div className="grid grid-cols-3 gap-2">
                   <button onClick={() => window.open("/livetiming", "_blank")} className="px-2 py-2 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 rounded border border-white/5 text-center">Timing</button>
                   <button onClick={() => window.open("/grid", "_blank")} className="px-2 py-2 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 rounded border border-white/5 text-center">Grid</button>
                   <button onClick={() => window.open("/results", "_blank")} className="px-2 py-2 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 rounded border border-white/5 text-center">Results</button>
                 </div>
              </div>
              
              <div className="mt-4 text-center">
                <span className="text-[10px] font-mono text-white/20">v{__APP_VERSION__}</span>
              </div>
            </div>
          </div>



        </div>

        {/* Center Column: Race Control (4 cols) */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Race Flags */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl shrink-0">
            <SectionHeader title="Banderas" icon={<Flag className="w-5 h-5 text-[var(--accent)]" />} />
            <div className="p-4 grid grid-cols-2 gap-2">
               <button onClick={() => updateFlag("GREEN")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "GREEN" ? "bg-green-500 text-black border-transparent shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"}`}>
                  VERDE
               </button>
               <button onClick={() => updateFlag("YELLOW")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "YELLOW" ? "bg-yellow-500 text-black border-transparent shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20"}`}>
                  AMARILLA
               </button>
               <button onClick={() => updateFlag("SC")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "SC" ? "bg-orange-500 text-black border-transparent shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse" : "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20"}`}>
                  SAFETY CAR
               </button>
               <button onClick={() => updateFlag("SLOW")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "SLOW" ? "bg-orange-500 text-black border-transparent shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse" : "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20"}`}>
                  SLOW
               </button>
               <button onClick={() => updateFlag("BLUE")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "BLUE" ? "bg-blue-600 text-white border-transparent shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-pulse" : "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"}`}>
                  AZUL
               </button>
               <button onClick={() => updateFlag("WHITE")} className={`p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "WHITE" ? "bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}>
                  BLANCA
               </button>
               <button onClick={() => updateFlag("RED")} className={`col-span-2 p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "RED" ? "bg-red-600 text-white border-transparent shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"}`}>
                  ROJA
               </button>
               <button onClick={() => updateFlag("FINISH")} className={`col-span-2 p-4 rounded font-black text-sm uppercase border transition-all ${raceFlag === "FINISH" ? "bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}>
                  FINAL (AJEDREZ)
               </button>

               <div className="col-span-2 flex gap-2 pt-2 border-t border-white/5 mt-2">
                 <input 
                   value={blackFlagNum}
                   onChange={(e) => setBlackFlagNum(e.target.value)}
                   placeholder="#"
                   className="w-20 bg-black/40 border border-white/20 rounded text-center font-mono font-bold text-white focus:border-[var(--accent)] outline-none"
                />
                <button 
                   onClick={() => {
                     const target = blackFlagNum ? `BLACK:${blackFlagNum}` : "BLACK";
                     updateFlag(target);
                   }} 
                    className={`flex-1 p-3 rounded font-black text-sm uppercase border transition-all ${raceFlag && raceFlag.startsWith("BLACK") ? "bg-black text-white border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse" : "bg-black/40 text-gray-400 border-white/10 hover:bg-black/60"}`}
                 >
                    BANDERA NEGRA
                 </button>
               </div>
            </div>
          </div>

          {/* Voting Manager */}
          <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col shrink-0">
             <div className="bg-white/[0.02] flex flex-col">
                <SectionHeader title="Piloto Destacado" icon={<Award className="w-5 h-5 text-[var(--accent)]" />} />
                <div className="p-6 flex-1 flex flex-col">
                  {!votingActive ? (
                    <div className="flex flex-col gap-6">
                       <div className="text-center">
                         <div className="text-white/60 text-xs max-w-xs mx-auto">
                           Selecciona pilotos en la tabla de la derecha.
                         </div>
                       </div>
                       
                       <div className="flex items-center justify-center py-2">
                         {selectedCandidates.length > 0 ? (
                           <div className="flex flex-wrap gap-2 justify-center content-center">
                              {selectedCandidates.map(c => (
                                <span key={c.number} onClick={() => toggleCandidate(c)} className="cursor-pointer group relative px-3 py-1.5 bg-white/10 rounded-md border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all">
                                   <span className="font-bold text-[var(--accent)] mr-2">#{c.number}</span>
                                   <span className="font-medium text-sm">{c.name}</span>
                                   <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <X className="w-3 h-3 text-white" />
                                   </span>
                                </span>
                              ))}
                           </div>
                         ) : (
                           <div className="w-full p-4 border-2 border-dashed border-white/10 rounded-xl text-white/20 text-sm italic text-center flex flex-col items-center gap-2">
                             <span>Ningún piloto seleccionado</span>
                           </div>
                         )}
                       </div>

                       <div className="mt-auto">
                          <button 
                            onClick={startVoting} 
                            disabled={selectedCandidates.length < 2} 
                            className="w-full py-3 font-black uppercase italic tracking-wider rounded text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transform hover:-translate-y-1"
                          >
                            INICIAR VOTACIÓN
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="font-bold text-green-400 tracking-wide uppercase text-xs">En curso</span>
                        </div>
                        <div className="text-xl font-black tabular-nums">{voteStats.totalVotes} <span className="text-xs font-medium opacity-50">votos</span></div>
                      </div>

                      <div className="space-y-2">
                        {voteStats.candidates.sort((a,b) => b.votes - a.votes).map(c => (
                          <div key={c.number} className="relative group">
                            <div className="flex justify-between text-xs font-bold mb-1 z-10 relative">
                              <span className="flex items-center gap-2">
                                <span className="text-[var(--accent)]">#{c.number}</span>
                                {c.name}
                              </span>
                              <span>{c.percent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--accent)] transition-all duration-500 ease-out" style={{ width: `${c.percent}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <ActionButton 
                          onClick={stopVoting} 
                          label="FINALIZAR VOTACIÓN" 
                          type="danger" 
                          active={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
             </div>
             
             {votingActive && (
               <div className="w-full bg-white/5 p-4 flex flex-col items-center justify-center gap-4 text-center border-t border-white/5">
                  <div className="p-2 bg-white rounded-xl shadow-2xl">
                    <QRCodeSVG value={publicUrl ? `${publicUrl.replace(/\/$/, "")}/vote` : `${window.location.protocol}//${window.location.hostname}:${window.location.port}/vote`} size={120} />
                  </div>
                  <div className="space-y-1">
                    <a href={publicUrl ? `${publicUrl.replace(/\/$/, "")}/vote` : "/vote"} target="_blank" className="text-blue-400 hover:text-blue-300 text-xs underline decoration-blue-500/30 underline-offset-4">
                      {publicUrl ? `${publicUrl.replace(/\/$/, "")}/vote` : "/vote page"}
                    </a>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: Data Table (5 cols) */}
        <div className="col-span-12 xl:col-span-5 flex flex-col bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl min-h-0">
          <SectionHeader title="Selección de Candidatos" icon={<ListChecks className="w-5 h-5 text-[var(--accent)]" />} />
          <div className="flex-1 overflow-auto custom-scrollbar">
            {/* Quick Selection Toolbar */}
            <div className="sticky top-0 z-20 bg-[#1a1a1a] border-b border-white/5 p-2 flex gap-2 overflow-x-auto">
                <button onClick={() => setSelectedCandidates([])} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Limpiar
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={() => setSelectedCandidates(previewRows.slice(0, 3).map(r => ({ number: r.number, name: r.name })))} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Top 3
                </button>
                <button onClick={() => setSelectedCandidates(previewRows.slice(0, 5).map(r => ({ number: r.number, name: r.name })))} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Top 5
                </button>
                <button onClick={() => setSelectedCandidates(previewRows.slice(0, 10).map(r => ({ number: r.number, name: r.name })))} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Top 10
                </button>
                <button onClick={() => setSelectedCandidates(previewRows.map(r => ({ number: r.number, name: r.name })))} className="px-2 py-1 text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors whitespace-nowrap">
                   Todos
                </button>
                <div className="ml-auto flex items-center text-[10px] font-mono text-white/40">
                   {selectedCandidates.length} SELECCIONADOS
                </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead className="sticky top-[45px] bg-[#1a1a1a] z-10 shadow-lg">
                <tr className="text-xs font-bold uppercase tracking-wider text-white/50">
                  <th className="p-3 w-10 text-center">Sel</th>
                  <th className="p-3">Pos</th>
                  <th className="p-3">#</th>
                  <th className="p-3">Piloto</th>
                  <th className="p-3 text-right">M. Vuelta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {previewRows.map((r, i) => {
                   const isSelected = selectedCandidates.some(c => c.number === r.number);
                   return (
                     <tr 
                       key={i} 
                       onClick={() => toggleCandidate(r)} 
                       className={`group cursor-pointer transition-colors hover:bg-white/5 ${isSelected ? "bg-green-500/10" : ""}`}
                     >
                       <td className="p-3 text-center">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-green-500 border-green-500 text-black" : "border-white/20 group-hover:border-white/40"}`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </td>
                       <td className="p-3 font-mono font-bold text-sm">{r.position}</td>
                       <td className="p-3 font-mono text-[var(--accent)] font-bold text-sm">#{r.number}</td>
                       <td className="p-3 font-bold text-sm">{r.name}</td>
                       <td className="p-3 font-mono text-right text-sm">{r.bestLap}</td>
                     </tr>
                   );
                })}
                {previewRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-white/20 italic">
                      Esperando datos...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      ) : (
        <CircuitInfo token={token} />
      )}
      {showUsers && <UsersManager token={token} onClose={() => setShowUsers(false)} />}
    </div>
  );
}
