import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, 
  Library, 
  Save, 
  Trash2, 
  Map as MapIcon, 
  Flag, 
  Timer, 
  Info,
  X,
  Upload as UploadIcon,
  Plus,
  Copy
} from "lucide-react";
import Input from "../ui/Input";
import SectionHeader from "../ui/SectionHeader";

export default function CircuitInfo({ token }) {
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

  async function saveToLibrary(forceNew = false) {
    if (!name) return alert("El nombre del circuito es obligatorio para guardar en la biblioteca.");
    
    const isNew = !id || forceNew;
    const msg = isNew 
      ? "¿Guardar este circuito como NUEVO en la biblioteca?" 
      : "¿Actualizar el circuito existente en la biblioteca?";

    if (!confirm(msg)) return;
    
    try {
      const apiOrigin = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiOrigin}/api/circuits`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id: isNew ? null : id, 
          name, location, length, turns, recordTime, recordDriver, recordYear, mapUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryCircuits(data.library);
        if (data.savedCircuit?.id) {
          setId(data.savedCircuit.id);
        }
        alert(isNew ? "Circuito creado en biblioteca." : "Circuito actualizado en biblioteca.");
      } else {
        alert("Error al guardar en biblioteca.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al guardar en biblioteca.");
    }
  }

  function clearForm() {
    if (confirm("¿Limpiar el formulario? Se perderán los cambios no guardados.")) {
        setId(null);
        setName("");
        setLocation("");
        setLength("");
        setTurns("");
        setRecordTime("");
        setRecordDriver("");
        setRecordYear("");
        setMapUrl("");
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
    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
      <div className="w-full space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
           <div>
             <h2 className="text-2xl font-black italic uppercase">Información del Circuito</h2>
             <p className="text-white/40 text-sm">Gestiona los datos del trazado actual</p>
           </div>
           <div className="flex items-center gap-2">
             <button 
                onClick={() => window.open("/track", "_blank")}
                className="px-3 py-2 bg-white/10 text-white font-bold uppercase italic tracking-wider rounded text-xs hover:bg-white/20 border border-white/10 flex items-center gap-2"
             >
                <Tv className="w-3 h-3" /> Overlay
             </button>
             <button 
                onClick={() => setLibraryOpen(true)}
                className="px-3 py-2 bg-[var(--accent)]/10 text-[var(--accent)] font-bold uppercase italic tracking-wider rounded text-xs hover:bg-[var(--accent)]/20 border border-[var(--accent)] flex items-center gap-2"
             >
                <Library className="w-3 h-3" /> Biblioteca
             </button>
             <button 
                onClick={clearForm}
                className="px-3 py-2 bg-white/5 text-white/70 font-bold uppercase italic tracking-wider rounded text-xs hover:bg-white/10 border border-white/5 flex items-center gap-2"
                title="Limpiar formulario para crear nuevo"
             >
                <Plus className="w-3 h-3" /> Nuevo
             </button>
             <button 
                onClick={saveCircuit} 
                disabled={saving}
                className="px-4 py-2 bg-[var(--accent)] text-black font-bold uppercase italic tracking-wider rounded text-xs hover:brightness-110 border border-transparent flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {saving ? "Aplicando..." : "Aplicar a Overlay"}
              </button>
            </div>
         </div>

        {status && (
          <div className={`p-2 rounded border ${status.includes("Error") ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"} text-xs font-bold text-center`}>
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* General Info */}
          <div className="lg:col-span-4 bg-[#141414] p-4 rounded-xl border border-white/5 space-y-3 h-full">
            <SectionHeader title="Datos Generales" icon={<Flag className="w-4 h-4 text-[var(--accent)]" />} />
            <Input label="Nombre del Circuito" value={name} onChange={setName} placeholder="Ej: Autódromo Oscar y Juan Gálvez" />
            <Input label="Ubicación" value={location} onChange={setLocation} placeholder="Ej: Buenos Aires, Argentina" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Longitud (km/m)" value={length} onChange={setLength} placeholder="Ej: 4.2 km" />
              <Input label="Curvas" value={turns} onChange={setTurns} placeholder="Ej: 12" />
            </div>
          </div>

          {/* Record Info */}
          <div className="lg:col-span-3 bg-[#141414] p-4 rounded-xl border border-white/5 space-y-3 h-full">
            <SectionHeader title="Récord de Vuelta" icon={<Timer className="w-4 h-4 text-[var(--accent)]" />} />
            <Input label="Tiempo Récord" value={recordTime} onChange={setRecordTime} placeholder="Ej: 1:32.456" />
            <Input label="Piloto" value={recordDriver} onChange={setRecordDriver} placeholder="Ej: Juan Manuel Fangio" />
            <Input label="Año" value={recordYear} onChange={setRecordYear} placeholder="Ej: 2023" />
          </div>

          {/* Map / Image */}
          <div className="lg:col-span-5 bg-[#141414] p-4 rounded-xl border border-white/5 space-y-3 h-full flex flex-col">
            <SectionHeader title="Mapa del Circuito" icon={<MapIcon className="w-4 h-4 text-[var(--accent)]" />} />
            
            <div className="flex-1 min-h-[150px] bg-black/40 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative mb-2 group">
                {mapUrl ? (
                <img 
                    src={mapUrl} 
                    alt="Mapa" 
                    className="max-w-full max-h-[200px] object-contain p-4 transition-transform group-hover:scale-105" 
                />
                ) : (
                <div className="text-center text-white/20 p-4">
                    <MapIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <span className="text-xs uppercase font-bold block">Vista Previa</span>
                </div>
                )}
            </div>

            <div className="space-y-3">
                <Input label="URL de la Imagen" value={mapUrl} onChange={setMapUrl} placeholder="https://..." />
                
                <div className="flex gap-2">
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
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold uppercase text-xs rounded transition-colors flex items-center justify-center gap-2"
                    title="Subir imagen PNG (max 1MB)"
                    >
                    {uploading ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span> : <UploadIcon className="w-3 h-3" />}
                    {uploading ? "Subiendo..." : "Subir PNG"}
                    </button>
                </div>
            </div>
          </div>
        </div>
        
        {/* Library Actions Footer */}
        <div className="bg-[#141414] p-4 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-xs text-white/50">
                {id ? (
                    <span>Editando: <strong className="text-white">{name}</strong> (ID: {id.slice(-6)})</span>
                ) : (
                    <span>Creando nuevo circuito</span>
                )}
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                 {id && (
                    <button 
                        onClick={() => saveToLibrary(true)}
                        className="flex-1 md:flex-none px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold uppercase text-xs rounded transition-colors flex items-center justify-center gap-2"
                        title="Guardar como una copia nueva (sin sobreescribir)"
                    >
                        <Copy className="w-3 h-3" /> Copia
                    </button>
                 )}

                 <button 
                    onClick={() => saveToLibrary(false)}
                    className="flex-1 md:flex-none px-4 py-2 bg-[var(--accent)]/10 border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 text-[var(--accent)] font-bold uppercase text-xs rounded transition-colors flex items-center justify-center gap-2"
                    title={id ? "Actualizar circuito existente" : "Guardar nuevo circuito"}
                 >
                    <Save className="w-3 h-3" /> {id ? "Actualizar" : "Guardar"}
                 </button>
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
