import React from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-[var(--accent)] selection:text-black">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
           <div className="w-4 h-4 bg-[var(--accent)] transform -skew-x-12" />
           <div className="font-black italic tracking-tighter text-lg uppercase">StreamRace</div>
        </div>
        <div>
          <a href="/dashboard" className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
            Acceso Clientes
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[150px]" />
        </div>

        <div className="z-10 max-w-5xl w-full py-12 md:py-24">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-[var(--accent)] animate-fade-in-down">
            Nueva Versión {__APP_VERSION__} Disponible
          </div>

          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-6 leading-tight">
            Overlays Profesionales para <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-purple-500">Speedhive</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/60 font-light mb-12 max-w-3xl mx-auto leading-relaxed">
            Mejora tus transmisiones de carreras con datos en tiempo real directamente desde Speedhive. Sin entrada manual, cero latencia, totalmente automatizado.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-20">
            <button className="px-8 py-4 bg-[var(--accent)] text-black font-black uppercase italic tracking-wider rounded hover:brightness-110 transition-all shadow-[0_0_30px_rgba(var(--accent-rgb),0.4)] transform hover:-translate-y-1">
              Obtener Acceso Anticipado
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider rounded hover:bg-white/10 transition-all">
              Ver Demo en Vivo
            </button>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <FeatureCard 
              icon={<ZapIcon />}
              title="Sincronización Real"
              description="Integración directa con Speedhive asegura que tu tabla de posiciones esté siempre actualizada al segundo."
            />
            <FeatureCard 
              icon={<TvIcon />}
              title="Listo para OBS"
              description="Overlays web transparentes optimizados para streaming en 1080p. Solo agrega la fuente de navegador."
            />
             <FeatureCard 
              icon={<TrophyIcon />}
              title="Votación en Vivo"
              description="Involucra a tus espectadores con widgets integrados de votación para el 'Piloto del Día'."
            />
             <FeatureCard 
              icon={<CloudIcon />}
              title="100% en la Nube"
              description="Sin software para instalar. Nosotros alojamos la infraestructura, tú solo compartes el enlace."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center text-white/20 text-xs font-mono border-t border-white/5 bg-black/20">
        <div className="mb-4 flex justify-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Contacto</a>
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
          <a href="#" className="hover:text-white transition-colors">Discord</a>
        </div>
        &copy; {new Date().getFullYear()} STREAMRACE. TODOS LOS DERECHOS RESERVADOS.
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold uppercase italic tracking-wide mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}

// Icons
function ZapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  );
}

function TvIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
  );
}

function TrophyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
  );
}

function CloudIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.1-2.9-2.4-5.2-5.3-5.3-2.6 0-4.8 1.9-5.3 4.4C1.2 16.1 2.2 17.9 4 18.7c.6.3 1.3.3 2 .3h11.5c1.7 0 3 1.3 3 3s-1.3 3-3 3h-1.1"/></svg>
  );
}
