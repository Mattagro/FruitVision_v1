import React, { useState } from 'react';
import { Download, Smartphone, Check, X, Share, MoreVertical, WifiOff, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  const handleButtonClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <Check className="w-3.5 h-3.5" />
        <span>PWA Instalada (Offline lista)</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleButtonClick}
        title="Instalar como aplicación en tu móvil para uso sin conexión a internet"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 active:scale-95 transition-all rounded-lg cursor-pointer shrink-0 shadow-sm"
      >
        <Download className="w-3.5 h-3.5 animate-pulse" />
        <span className="hidden sm:inline">Instalar en Móvil</span>
        <span className="sm:hidden">Instalar App</span>
      </button>

      {/* Instructional Modal for Manual Installation or iOS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title & Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalar CitrusVision en tu Móvil</h3>
                <p className="text-xs text-slate-400">Funciona en terreno sin cobertura ni datos</p>
              </div>
            </div>

            {/* Offline badge */}
            <div className="flex items-center gap-2 p-2.5 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Al instalarla, los algoritmos de visión se guardan en tu móvil y podrás contar fruta <strong>sin señal en el campo</strong>.
              </span>
            </div>

            {/* Operating System Selector Tabs */}
            <div className="flex p-1 mb-4 rounded-xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => setActiveGuideTab('android')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeGuideTab === 'android'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                onClick={() => setActiveGuideTab('ios')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeGuideTab === 'ios'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                iPhone / iPad (Safari)
              </button>
            </div>

            {/* Steps Android */}
            {activeGuideTab === 'android' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">Abre el menú de Chrome</p>
                    <p className="text-slate-400 mt-0.5">
                      Toca el icono de los <strong>tres puntos verticales (⋮)</strong> en la esquina superior derecha del navegador.
                    </p>
                  </div>
                  <MoreVertical className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">Selecciona "Instalar aplicación"</p>
                    <p className="text-slate-400 mt-0.5">
                      En el menú desplegable, pulsa en <strong>"Instalar aplicación"</strong> (o <strong>"Añadir a la pantalla de inicio"</strong>).
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">Confirma la instalación</p>
                    <p className="text-slate-400 mt-0.5">
                      Pulsa <strong>"Instalar"</strong>. El icono con la naranja de CitrusVision se añadirá a tus aplicaciones.
                    </p>
                  </div>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                </div>
              </div>
            )}

            {/* Steps iOS */}
            {activeGuideTab === 'ios' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">Abre la web en Safari</p>
                    <p className="text-slate-400 mt-0.5">
                      Apple solo permite instalar PWAs directamente desde el navegador <strong>Safari</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">Toca el botón Compartir</p>
                    <p className="text-slate-400 mt-0.5">
                      En la barra inferior de Safari, pulsa el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba).
                    </p>
                  </div>
                  <Share className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">Añadir a la pantalla de inicio</p>
                    <p className="text-slate-400 mt-0.5">
                      Desliza hacia abajo en las opciones y selecciona <strong>"Añadir a la pantalla de inicio"</strong>. Luego pulsa <strong>"Añadir"</strong> arriba a la derecha.
                    </p>
                  </div>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                </div>
              </div>
            )}

            {/* Direct Trigger button if installable */}
            {isInstallable && (
              <button
                onClick={async () => {
                  setShowModal(false);
                  await install();
                }}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Ahora Directamente</span>
              </button>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-3 w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              Entendido / Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
