import React from "react";
import { CircleHelp, Terminal, Monitor, Settings, Layout } from "lucide-react";
import SectionHeader from "../ui/SectionHeader";

export default function HelpPanel() {
  const origin = window.location.origin;

  return (
    <div className="w-full max-w-6xl mx-auto bg-[#141414] rounded-xl border border-white/5 overflow-hidden shadow-2xl flex flex-col flex-1 min-h-0 my-6">
      <SectionHeader 
        title="Manual de Ayuda" 
        icon={<CircleHelp className="w-5 h-5 text-[var(--accent)]" />} 
      />
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Section: OBS Integration */}
        <section className="space-y-4">
           <div className="flex items-center gap-2 text-[var(--accent)]">
            <Monitor className="w-5 h-5" />
            <h2 className="text-xl font-black italic uppercase tracking-wider">Configuración en OBS</h2>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
             <p className="text-gray-300 text-sm">Para agregar los overlays en OBS Studio, utiliza fuentes de tipo <strong>Navegador (Browser Source)</strong>:</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OverlayCard title="Live Timing" url={`${origin}/livetiming`} desc="Tabla de tiempos en tiempo real." />
                <OverlayCard title="Widget Votación" url={`${origin}/voting-widget`} desc="Widget compacto con QR y top 3." />
                <OverlayCard title="Overlay Votación" url={`${origin}/voting-overlay`} desc="Vista completa de resultados de votación." />
                <OverlayCard title="Resultados" url={`${origin}/results`} desc="Podio y tabla final de carrera." />
             </div>

             <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-400">
                <h3 className="font-bold text-white mb-2 uppercase text-xs tracking-wider">Pasos Rápidos:</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                   <li>Agrega una nueva fuente <strong>Navegador</strong>.</li>
                   <li>Copia y pega la URL deseada de las opciones arriba.</li>
                   <li>Ajusta el ancho (Width) y alto (Height) según tu escena (ej. 1920x1080).</li>
                   <li>(Opcional) Marca <em>"Refresh browser when scene becomes active"</em> si necesitas recargar al cambiar de escena.</li>
                </ul>
             </div>
          </div>
        </section>

         {/* Section 3: Dashboard Usage */}
         <section className="space-y-4">
           <div className="flex items-center gap-2 text-[var(--accent)]">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-black italic uppercase tracking-wider">Uso del Dashboard</h2>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
             <div className="grid gap-4 text-sm">
                <div className="flex gap-3">
                   <Layout className="w-5 h-5 text-white/50 shrink-0" />
                   <div>
                      <strong className="text-white block mb-1">Configuración</strong>
                      <p className="text-gray-400">Ingresa la URL de Speedhive en la pestaña de configuración para comenzar a recibir datos.</p>
                   </div>
                </div>
                <div className="flex gap-3">
                   <Settings className="w-5 h-5 text-white/50 shrink-0" />
                   <div>
                      <strong className="text-white block mb-1">Votación</strong>
                      <p className="text-gray-400">Selecciona los pilotos desde la lista (derecha) y haz clic en "Iniciar Votación" para abrir las urnas.</p>
                   </div>
                </div>
             </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function OverlayCard({ title, url, desc }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-black/20 p-3 rounded border border-white/5 hover:border-[var(--accent)] transition-colors group">
       <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-white text-sm uppercase">{title}</span>
          <button onClick={copyToClipboard} className={`text-[10px] px-2 py-0.5 rounded uppercase font-mono transition-colors ${copied ? "bg-green-500/20 text-green-400" : "bg-white/10 hover:bg-white/20 text-white/70"}`}>
            {copied ? "Copiado" : "Copiar URL"}
          </button>
       </div>
       <div className="text-[10px] font-mono text-[var(--accent)] truncate mb-2 select-all">{url}</div>
       <div className="text-xs text-gray-500">{desc}</div>
    </div>
  );
}