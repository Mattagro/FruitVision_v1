import React, { useState } from 'react';
import { 
  BookOpen, Camera, Sliders, Eye, 
  BarChart3, FolderArchive, Cpu, 
  CheckCircle2, ArrowRight, ShieldCheck, 
  Sparkles, Layers, Calculator, Smartphone,
  Download, HelpCircle, ChevronDown, ChevronRight,
  Sun, WifiOff, FileText, Check, AlertTriangle
} from 'lucide-react';

interface ManualViewProps {
  onNavigateTab: (tab: any) => void;
}

export const ManualView: React.FC<ManualViewProps> = ({ onNavigateTab }) => {
  const [activeSection, setActiveSection] = useState<'guia_rapida' | 'modulos' | 'calibracion' | 'agronomia' | 'faq'>('guia_rapida');

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-8 text-slate-200">
      
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Manual de Usuario Completo y Sencillo</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Guía Práctica de Uso: CitrusVision en Terreno
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Aprende a usar la aplicación paso a paso para contar cítricos en el árbol, estimar la cosecha en toneladas por hectárea y trabajar sin conexión a internet en el huerto.
        </p>
      </div>

      {/* Navigation Tabs for Manual */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none text-xs">
        <button
          onClick={() => setActiveSection('guia_rapida')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            activeSection === 'guia_rapida'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          🚀 1. Guía Rápida (Paso a Paso)
        </button>

        <button
          onClick={() => setActiveSection('modulos')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            activeSection === 'modulos'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          📱 2. Guía de Cada Pantalla
        </button>

        <button
          onClick={() => setActiveSection('calibracion')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            activeSection === 'calibracion'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          🎨 3. Calibrar Color y Detección
        </button>

        <button
          onClick={() => setActiveSection('agronomia')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            activeSection === 'agronomia'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          📊 4. Estimación de Kilos y Toneladas
        </button>

        <button
          onClick={() => setActiveSection('faq')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            activeSection === 'faq'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          ❓ 5. Preguntas Frecuentes
        </button>
      </div>

      {/* SECTION 1: GUÍA RÁPIDA PASO A PASO */}
      {activeSection === 'guia_rapida' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-300">¿Para qué sirve CitrusVision?</p>
              <p className="mt-1 leading-relaxed text-slate-300">
                Te permite apuntar la cámara de tu teléfono a los árboles de cítricos (naranjos, limoneros, mandarinos) para <strong>contar automáticamente los frutos visibles</strong>, corregirlos con un toque de dedo y <strong>calcular cuántos kilos por árbol y cuántas toneladas por hectárea</strong> rendirá tu huerto antes de cosechar, incluso si estás en medio del campo sin señal de internet.
              </p>
            </div>
          </div>

          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>El Trabajo Diario en el Huerto: 5 Pasos Sencillos</span>
          </h2>

          <div className="grid grid-cols-1 gap-4 text-xs">
            
            {/* Paso 1 */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Instala la App en tu Móvil (Una sola vez)</h3>
                  <span className="text-[11px] text-slate-400">Para poder usarla sin internet en el campo</span>
                </div>
              </div>
              <p className="text-slate-300 pl-10 leading-relaxed">
                Toca el botón <strong>"Instalar en Móvil"</strong> arriba en la pantalla, o en el menú de Chrome/Safari elige <strong>"Añadir a la pantalla de inicio"</strong>. La app quedará como un icono en tu teléfono y descargará los modelos a la memoria interna.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Abre la "Cámara en Vivo" frente al Árbol</h3>
                  <span className="text-[11px] text-slate-400">Distancia recomendada: de 2 a 3 metros</span>
                </div>
              </div>
              <p className="text-slate-300 pl-10 leading-relaxed">
                Párate frente al árbol de manera que la copa ocupe la mayor parte de la pantalla. Verás que la cámara resalta cada naranja o limón con un <strong>recuadro con su porcentaje de certeza</strong>. Arriba verás el total de frutas contadas en tiempo real.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Presiona "Congelar & Anotar"</h3>
                  <span className="text-[11px] text-slate-400">Captura la foto fija para revisarla</span>
                </div>
              </div>
              <p className="text-slate-300 pl-10 leading-relaxed">
                Al pulsar el botón amarillo <strong>Congelar & Anotar</strong>, la cámara toma la foto fija con máxima calidad y te lleva a la pantalla del <strong>Anotador</strong>. (O si tienes prisa, pulsa <strong>Guardar Rápido</strong> para guardarla directamente).
              </p>
            </div>

            {/* Paso 4 */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Revisa y Corrige los Frutos (Opcional)</h3>
                  <span className="text-[11px] text-slate-400">Control de calidad en 5 segundos</span>
                </div>
              </div>
              <p className="text-slate-300 pl-10 leading-relaxed">
                En el Anotador puedes ver los cuadros detectados:
                <br />• <strong>¿Faltó una fruta oculta?</strong> Toca el botón <em>Dibujar</em> y arrastra el dedo sobre ella para agregarla.
                <br />• <strong>¿Marcó una hoja amarilla por error?</strong> Toca el cuadro y pulsa el icono de la <em>Papelera</em> para quitarla.
                <br />• Al terminar, pulsa <strong>Guardar Captura</strong>. Se guardará con tu GPS y fecha.
              </p>
            </div>

            {/* Paso 5 */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
                  5
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Consulta el Rendimiento Estimado</h3>
                  <span className="text-[11px] text-slate-400">Kilos por árbol y Toneladas por hectárea</span>
                </div>
              </div>
              <p className="text-slate-300 pl-10 leading-relaxed">
                Ve a la pestaña <strong>Rendimiento</strong>. A medida que vayas midiendo más árboles del cuartel, el sistema te indicará en color verde si ya tienes una muestra estadísticamente representativa y te dará el volumen estimado de tu cosecha.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 2: GUÍA DE CADA PANTALLA */}
      {activeSection === 'modulos' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          
          <div className="space-y-4">
            
            {/* Cámara en Vivo */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span>1. Pantalla: Cámara en Vivo</span>
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">Detección a 30 FPS</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Es la pantalla principal de trabajo cuando caminas por la hilera.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white block mb-1">Botón de Encendido / Apagado (Cámara On/Off)</span>
                  <span>Permite apagar el sensor de la cámara cuando te desplazas entre hileras o descansas para <strong>ahorrar batería</strong> del teléfono.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white block mb-1">Contador Instantáneo y FPS</span>
                  <span>Te muestra arriba la cantidad de fruta visible en ese segundo exacto y la velocidad a la que procesa tu móvil.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white block mb-1">Botón "Congelar & Anotar"</span>
                  <span>Inmoviliza la imagen en alta resolución y la traslada al anotador para guardarla formalmente.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white block mb-1">Botón "Guardar Rápido"</span>
                  <span>Guarda la foto y los conteos directamente en la memoria del teléfono sin pasar por la edición manual.</span>
                </div>
              </div>
            </div>

            {/* Anotador & Visión */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>2. Pantalla: Anotador & Visión</span>
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">Edición de Frutos</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Aquí inspeccionas la foto en detalle. Puedes hacer zoom con dos dedos en el móvil o con la rueda del ratón en PC.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
                <li><strong>Modo Mover (Pan):</strong> Te permite desplazarte por la foto sin crear cuadros accidentales.</li>
                <li><strong>Modo Dibujar (Draw):</strong> Arrastra tu dedo sobre una fruta para trazar un nuevo recuadro manual.</li>
                <li><strong>Modo Seleccionar:</strong> Toca cualquier recuadro para ver sus dimensiones o eliminarlo con la papelera.</li>
                <li><strong>Ficha de Datos del Árbol (Panel derecho):</strong> Aquí puedes cambiar el nombre del Cuartel, el número de hilera y el número de árbol antes de guardar.</li>
              </ul>
            </div>

            {/* Rendimiento */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>3. Pantalla: Rendimiento (Proyección Agronómica)</span>
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">Estimación de Cosecha</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Traduce el conteo de la cámara en números agronómicos reales:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-emerald-400 block mb-1">Kilos por Árbol</span>
                  <span>Promedio de fruta contada multiplicado por el peso del fruto y corregido por el follaje interior.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-emerald-400 block mb-1">Toneladas / Hectárea</span>
                  <span>Cálculo directo según los árboles que caben por hectárea en ese cuartel.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-emerald-400 block mb-1">Meta de Muestreo (n)</span>
                  <span>Un indicador que te dice si llevas suficientes árboles contados para tener un 95% de seguridad en la estimación.</span>
                </div>
              </div>
            </div>

            {/* Biblioteca */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <FolderArchive className="w-4 h-4" />
                  <span>4. Pantalla: Biblioteca de Muestreos</span>
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">Exportación y Archivo</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Es tu registro histórico guardado en el teléfono:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white flex items-center gap-1.5 mb-1">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Botón "CSV" (Excel)</span>
                  </span>
                  <span>Descarga en un clic la planilla con todos los conteos, GPS y estimaciones de kilos por cuartel lista para abrir en Excel o WhatsApp.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white flex items-center gap-1.5 mb-1">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Botón "Exportar YOLO (ZIP)"</span>
                  </span>
                  <span>Empaqueta todas las fotos y coordenadas de cada fruto para entrenar modelos de Inteligencia Artificial más avanzados.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 3: CALIBRAR COLOR Y DETECCIÓN */}
      {activeSection === 'calibracion' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>¿Cómo Calibrar el Color (HSV) en Días Soleados o Nublados?</span>
            </h3>
            <p className="text-slate-300 leading-relaxed">
              La luz del sol cambia a lo largo del día. A las 12:00 del mediodía la luz es muy brillante y quema los colores, mientras que a las 18:00 o bajo nubes hay sombras profundas. El <strong>Calibrador HSV</strong> te permite adaptar la cámara con tres botones predefinidos:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30">
                <span className="font-bold text-amber-400 block mb-1">🍊 Naranja Valencia / Navel</span>
                <span className="text-slate-400">Calibrado para tonos naranjas intensos (Hue 8° a 42°). Es el modo por defecto para huertos de naranja madura.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-yellow-500/30">
                <span className="font-bold text-yellow-400 block mb-1">🍋 Limón Amarillo / Eureka</span>
                <span className="text-slate-400">Calibrado para tonos amarillo-verdosos (Hue 40° a 78°). No confunde el limón con las hojas verde oscuro.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-orange-500/30">
                <span className="font-bold text-orange-400 block mb-1">🍊 Mandarina / Clementina</span>
                <span className="text-slate-400">Calibrado para frutos más pequeños y de coloración naranja-rojiza muy viva.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
              <span className="font-bold text-white text-xs block">¿Qué significa cada control si quieres afinarlo a mano?</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                <li><strong>Tono (Hue):</strong> Es la familia del color (ej. naranja o amarillo). Muévelo si tus frutas son más amarillas o más rojizas.</li>
                <li><strong>Saturación (Saturation):</strong> Qué tan "vivo" es el color. Filtra el cielo blanco y las hojas secas grises.</li>
                <li><strong>Brillo (Value):</strong> Ayuda a que la cámara vea naranjas que quedaron en la sombra adentro de la copa.</li>
                <li><strong>Circularidad mínima:</strong> Obliga a que la cámara solo marque objetos redondos. Si subes este valor a 0.70, jamás marcará una hoja alargada.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: ESTIMACIÓN DE KILOS Y TONELADAS */}
      {activeSection === 'agronomia' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span>Cómo se Calculan los Kilos y Toneladas (Explicación Sencilla)</span>
            </h3>
            
            <p className="text-slate-300 leading-relaxed">
              Muchos agricultores se preguntan: <em>"¿Cómo sabe la aplicación cuánta fruta hay en el árbol si la cámara solo ve un lado o la parte de afuera?"</em>. Aquí está la fórmula agronómica explicada en 3 pasos:
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-amber-400 block text-xs">1. La fruta oculta (El Factor de Follaje: 1.35x)</span>
                <p className="text-slate-300 leading-relaxed">
                  Por naturaleza vegetal, cuando miras un árbol desde fuera, tus ojos y la cámara solo ven entre el <strong>65% y 75%</strong> de la fruta; el resto está escondido detrás de las hojas interiores. Por eso la app aplica un <strong>Factor de Follaje de 1.35</strong> (o el que tú elijas):
                </p>
                <div className="p-2 rounded bg-slate-900 font-mono text-center text-amber-300 text-[11px]">
                  Fruta Real del Árbol = Fruta que contó la cámara &times; 1.35
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-emerald-400 block text-xs">2. Kilos por Árbol</span>
                <p className="text-slate-300 leading-relaxed">
                  Toma la fruta real calculada y la multiplica por el peso promedio que tú configuraste (por ejemplo, 180 gramos por naranja Valencia):
                </p>
                <div className="p-2 rounded bg-slate-900 font-mono text-center text-emerald-300 text-[11px]">
                  Kilos por Árbol = (Fruta Real &times; Peso en gramos) &divide; 1000
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-sky-400 block text-xs">3. Toneladas por Hectárea (t/ha)</span>
                <p className="text-slate-300 leading-relaxed">
                  Multiplica los kilos por árbol por la cantidad de árboles que tienes plantados en una hectárea (densidad de plantación):
                </p>
                <div className="p-2 rounded bg-slate-900 font-mono text-center text-sky-300 text-[11px]">
                  Toneladas / ha = (Kilos por Árbol &times; Árboles por ha) &divide; 1000
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <strong>💡 Consejo agronómico:</strong> En la pestaña <em>Rendimiento</em> puedes cambiar el peso del fruto (g) y la densidad de árboles/ha para ver al instante cómo cambia tu estimación de cosecha.
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: PREGUNTAS FRECUENTES */}
      {activeSection === 'faq' && (
        <div className="space-y-4 animate-in fade-in duration-200 text-xs">
          
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>¿Qué significa el porcentaje (%) que aparece sobre cada recuadro?</span>
            </h4>
            <p className="text-slate-300 leading-relaxed pl-6">
              Es el <strong>Índice de Confianza</strong>. Si una naranja dice <strong>92%</strong>, significa que el algoritmo está un 92% seguro de que ese objeto redondo y anaranjado es una fruta real y no una hoja con sol. Si dice 45%, está en el límite y te conviene revisar si es fruta o reflejo.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>¿Se me van a borrar las fotos si apago el celular o no tengo internet?</span>
            </h4>
            <p className="text-slate-300 leading-relaxed pl-6">
              <strong>No.</strong> Las fotos y conteos se guardan en una base de datos local y permanente dentro de tu móvil llamada <em>IndexedDB</em>. Aunque reinicies el teléfono o te quedes sin cobertura, tus datos permanecen seguros.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>¿A qué distancia debo pararme del árbol?</span>
            </h4>
            <p className="text-slate-300 leading-relaxed pl-6">
              La distancia ideal es de <strong>2 a 3 metros</strong>. Lo importante es que la copa del árbol llene casi todo el encuadre de la pantalla. Si te paras demasiado lejos (más de 6 metros), los frutos se verán muy pequeños; si te pegas demasiado, solo contarás una rama.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>¿Debo fotografiar las dos caras del árbol o solo una?</span>
            </h4>
            <p className="text-slate-300 leading-relaxed pl-6">
              Puedes elegir: si fotografías una sola cara (ej. cara Este), usa un factor de follaje mayor (ej. 2.0x a 2.5x para proyectar el árbol completo). Si tienes tiempo y fotografías ambas caras (Este y Oeste), la aplicación sumará ambas y tendrás una precisión mucho más alta.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>¿Cómo abro los datos en mi computador en Excel?</span>
            </h4>
            <p className="text-slate-300 leading-relaxed pl-6">
              Entra a la pestaña <strong>Biblioteca</strong>, pulsa el botón <strong>CSV</strong>. Se descargará un archivo que puedes enviarte por correo, WhatsApp o cable USB y abrir directamente con doble clic en Microsoft Excel o Google Sheets.
            </p>
          </div>

        </div>
      )}

      {/* Footer Navigation CTA */}
      <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs text-slate-400">¿Listo para comenzar a medir en terreno?</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('camera')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-amber-500/10"
          >
            <Camera className="w-4 h-4" />
            <span>Abrir Cámara en Vivo</span>
          </button>
          <button
            onClick={() => onNavigateTab('yield')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Ver Calculadora de Cosecha</span>
          </button>
        </div>
      </div>

    </div>
  );
};
