import React, { useState, useEffect } from "react";
import { Radio, Tv, Image, Upload as UploadIcon, Trash2, X, Check } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";
import Input from "../ui/Input";
import ActionButton from "../ui/ActionButton";

export default function ConfigPanel({
  url,
  setUrl,
  publicUrl,
  setPublicUrl,
  status,
  saving,
  saveConfig,
  probar,
  overlayEnabled,
  commentsEnabled,
  votingWidgetEnabled,
  overtakesEnabled,
  currentLapEnabled,
  fastestLapEnabled,
  lapFinishEnabled,
  logoUrl,
  setLogoUrl
}) {
  const [uploading, setUploading] = useState(false);
  const [logoLibrary, setLogoLibrary] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [logoName, setLogoName] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  // Load logo library on mount
  useEffect(() => {
    fetchLogoLibrary();
  }, []);

  async function fetchLogoLibrary() {
    try {
        const token = localStorage.getItem("admin_token");
        const apiOrigin = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiOrigin}/api/logos`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setLogoLibrary(Array.isArray(data) ? data : []);
        }
    } catch (e) {
        console.error("Error fetching logo library:", e);
    }
  }

  async function deleteLogo(id) {
    if (!confirm("¿Eliminar este logo de la biblioteca?")) return;
    try {
        const token = localStorage.getItem("admin_token");
        const apiOrigin = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiOrigin}/api/logos/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            fetchLogoLibrary();
        }
    } catch (e) {
        console.error("Error deleting logo:", e);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setLogoName(file.name.split('.')[0]); // Default name from file
    
    // Create local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  }

  function cancelUpload() {
    setSelectedFile(null);
    setLogoName("");
    setPreviewUrl(null);
  }

  async function confirmUpload() {
    if (!selectedFile) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("title", logoName);
    
    try {
        const token = localStorage.getItem("admin_token");
        const apiOrigin = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiOrigin}/api/upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });
        
        if (!res.ok) throw new Error("Upload failed");
        
        const data = await res.json();
        // Update config with new logo URL
        saveConfig({ logoUrl: data.url });
        fetchLogoLibrary();
        cancelUpload(); // Reset form
    } catch (err) {
        console.error(err);
        alert("Error uploading logo");
    } finally {
        setUploading(false);
    }
  }

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* Connection Card */}
        <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl h-fit">
        <SectionHeader title="Fuente de Datos" icon={<Radio className="w-5 h-5 text-[var(--accent)]" />} status={status} />
        <div className="p-4 space-y-4">
            <Input
            label="Speedhive URL"
            value={url}
            onChange={setUrl}
            placeholder="https://speedhive.mylaps.com/..."
            />
            <Input
            label="URL Pública de Votación (Opcional)"
            value={publicUrl}
            onChange={setPublicUrl}
            placeholder="https://tudominio.com (para QR)"
            />
            <div className="grid grid-cols-2 gap-3">
                <ActionButton onClick={() => saveConfig()} disabled={saving} label="Guardar" type="normal" />
                <ActionButton onClick={probar} label="Probar" type="link" />
            </div>
        </div>
        </div>

        {/* Logo Card */}
        <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl h-fit">
        <SectionHeader title="Logotipo" icon={<Image className="w-5 h-5 text-[var(--accent)]" />} />
        <div className="p-4 space-y-4">
            <div className="flex flex-col items-center justify-center gap-4">
                {logoUrl ? (
                    <div className="relative group w-full h-40 bg-black/40 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden p-10">
                        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                        <button 
                          onClick={() => saveConfig({ logoUrl: "" })}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-red-500 font-bold"
                        >
                          <Trash2 className="w-6 h-6 mr-2" /> Eliminar
                        </button>
                    </div>
                ) : (
                    <div className="w-full h-32 bg-white/5 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-white/30">
                        <Image className="w-8 h-8 mb-2" />
                        <span className="text-xs">Sin logotipo</span>
                    </div>
                )}
                
                {/* Upload Section with Pre-upload Form */}
                {!selectedFile ? (
                    <label className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent)] text-black font-bold uppercase rounded cursor-pointer hover:bg-white transition-all ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                        <UploadIcon className="w-4 h-4" />
                        <span>Subir Nuevo Logo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                    </label>
                ) : (
                    <div className="bg-white/5 rounded p-3 border border-white/10 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-black/50 rounded flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                {previewUrl && <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <label className="block text-[10px] text-white/50 uppercase mb-1">Nombre del Logo</label>
                                <input 
                                    type="text" 
                                    value={logoName}
                                    onChange={(e) => setLogoName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-[var(--accent)] outline-none"
                                    placeholder="Ej: Sponsor Principal"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={confirmUpload}
                                disabled={uploading}
                                className="flex-1 bg-[var(--accent)] text-black text-xs font-bold py-1.5 rounded hover:bg-white transition-colors flex items-center justify-center gap-1"
                            >
                                {uploading ? "Subiendo..." : <><Check className="w-3 h-3" /> Guardar</>}
                            </button>
                            <button 
                                onClick={cancelUpload}
                                disabled={uploading}
                                className="flex-1 bg-white/10 text-white text-xs font-bold py-1.5 rounded hover:bg-white/20 transition-colors flex items-center justify-center gap-1"
                            >
                                <X className="w-3 h-3" /> Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="text-[10px] text-white/30 text-center">
                Aparecerá en la esquina superior derecha de todas las pantallas.
            </div>

            {/* Logo Library */}
            <div className="pt-4 border-t border-white/5">
                <div className="text-xs font-bold text-white/40 uppercase mb-3 flex justify-between items-center">
                    <span>Biblioteca</span>
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">{logoLibrary.length}</span>
                </div>
                
                {logoLibrary.length === 0 ? (
                    <div className="text-center py-4 text-xs text-white/20 italic">
                        No hay logos guardados
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                        {logoLibrary.map((logo) => (
                            <div key={logo.id} className="relative group aspect-square bg-black/40 rounded border border-white/5 overflow-hidden" title={logo.title || "Logo"}>
                                <img 
                                    src={logo.url} 
                                    alt={logo.title || "Library item"} 
                                    className="w-full h-full object-contain p-2 cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity" 
                                    onClick={() => saveConfig({ logoUrl: logo.url })}
                                />
                                {logoUrl === logo.url && (
                                    <div className="absolute inset-0 border-2 border-[var(--accent)] pointer-events-none rounded"></div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] text-white text-center truncate px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {logo.title || "Logo"}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteLogo(logo.id); }}
                                    className="absolute top-0 right-0 p-1 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        </div>
    </div>
  );
}