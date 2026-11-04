import React from 'react';
import { 
  BookOpen, Camera, Sliders, Eye, 
  BarChart3, FolderArchive, Cpu, 
  CheckCircle2, ArrowRight, ShieldCheck, 
  Sparkles, Layers, Calculator
} from 'lucide-react';

interface ManualViewProps {
  onNavigateTab: (tab: any) => void;
}

export const ManualView: React.FC<ManualViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-10 text-slate-200">
      
      {/* Hero Title */}
      <div className="pb-6 border-b border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Manual de Operación y Fundamentos Técnicos</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Manual de Usuario: Secuencia Lógica y Algoritmos de CitrusVision
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Guía técnica completa para agrónomos, operadores de campo y especialistas en visión por computador sobre el funcionamiento del sistema, la secuencia metodológica de muestreo y los algoritmos de detección en tiempo real.
        </p>
      </div>

      {/* 1. Secuencia Lógica General (El Flujo de Trabajo en Campo) */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-amber-400" />
          <span>1. Secuencia Lógica del Flujo de Trabajo (Workflow Paso a Paso)</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Para garantizar una estimación agronómica estadísticamente confiable (error &le; 10% al 95% de confianza), la aplicación sigue una secuencia cíclica estructurada en 6 etapas:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Paso 1 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Paso 1: Parámetros del Huerto</span>
              <span className="text-[10px] font-mono text-slate-500">PREPARACIÓN</span>
            </div>
            <p className="text-slate-300">
              Define los datos del bloque: <strong>Predio</strong>, <strong>Cuartel</strong>, <strong>Variedad</strong>, marco de plantación (árboles/ha) y peso medio proyectado del fruto (g).
            </p>
            <div className="text-[11px] text-slate-500">
              Ubicación: En el panel lateral del <em>Anotador</em> o en el <em>Simulador de Rendimiento</em>.
            </div>
          </div>

          {/* Paso 2 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Paso 2: Calibración Óptica HSV</span>
              <span className="text-[10px] font-mono text-slate-500">CALIBRACIÓN</span>
            </div>
            <p className="text-slate-300">
              Verifica el perfil de color según la variedad (Naranja, Limón, Mandarina o Envero). El algoritmo ajusta automáticamente la ganancia según la luz ambiental (sol directo vs sombra de copa).
            </p>
            <div className="text-[11px] text-slate-500">
              Ubicación: Módulo <em>Calibrador HSV</em> con máscara binaria en tiempo real.
            </div>
          </div>

          {/* Paso 3 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Paso 3: Captura con HUD en Terreno</span>
              <span className="text-[10px] font-mono text-slate-500">ADQUISICIÓN</span>
            </div>
            <p className="text-slate-300">
              Apunta la cámara del smartphone al árbol a 2-3 metros de distancia. El HUD en vivo procesa el fotograma a 30 FPS. Presiona <strong>Congelar & Anotar</strong> para capturar en resolución nativa.
            </p>
            <div className="text-[11px] text-slate-500">
              Ubicación: Módulo <em>Cámara en Vivo</em>.
            </div>
          </div>

          {/* Paso 4 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Paso 4: Validación y Corrección</span>
              <span className="text-[10px] font-mono text-slate-500">ANOTACIÓN</span>
            </div>
            <p className="text-slate-300">
              Revisa los frutos detectados. Puedes hacer zoom, arrastrar para dibujar cajas sobre frutos omitidos, o hacer clic para eliminar falsos positivos. Presiona <strong>Guardar Captura</strong>.
            </p>
            <div className="text-[11px] text-slate-500">
              Ubicación: Módulo <em>Anotador & Visión</em>.
            </div>
          </div>

          {/* Paso 5 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Paso 5: Evaluación Estadística</span>
              <span className="text-[10px] font-mono text-slate-500">AGRONOMÍA</span>
            </div>
            <p className="text-slate-300">
              El motor calcula si el número de árboles muestreados en el cuartel es suficiente ($n$ recomendada). Proyecta los kilos por árbol y toneladas por hectárea con el factor de follaje.
            </p>
            <div className="text-[11px] text-slate-500">
              Ubicación: Módulo <em>Rendimiento</em>.
            </div>
          </div>

          {/* Paso 6 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Paso 6: Exportación y Entrenamiento</span>
              <span className="text-[10px] font-mono text-slate-500">MEJORA CONTINUA</span>
            </div>
            <p className="text-slate-300">
              Exporta un archivo ZIP con el dataset estándar YOLO (train/val 80/20, fotos y etiquetas .txt) y el reporte CSV para el plan de cosecha o para re-entrenar modelos en Google Colab.
            </p>
            <div className="text-[11px] text-slate-500">
              Ubicación: Módulo <em>Biblioteca</em> y <em>Modelos YOLO</em>.
            </div>
          </div>

        </div>
      </section>

      {/* 2. Funcionamiento de los Algoritmos de Visión por Computador */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>2. Funcionamiento Interno de los Algoritmos de Visión</span>
        </h2>
        
        <div className="space-y-4 text-xs">
          
          {/* Algoritmo HSV */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-amber-400">A. Segmentación HSV Adaptativa con Normalización de Luz</h3>
            <p className="text-slate-300 leading-relaxed">
              El espacio de color RGB es muy sensible a la intensidad de la luz solar. Por eso convertimos cada píxel al espacio <strong>HSV (Hue, Saturation, Value)</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong>Hue (Matiz)</strong>: Separa el tono cromático del cítrico (ej. 8°–42° para naranja madura, 40°–78° para limón) independiente de si está en sombra o sol.</li>
              <li><strong>Saturation (Saturación)</strong>: Descarta cielos, reflejos blancos y elementos grises del fondo (S &ge; 35%).</li>
              <li><strong>Value (Luminancia)</strong>: Descarta sombras extremas y huecos negros dentro del dosel vegetal.</li>
            </ul>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
              <strong>Compensación ambiental automática:</strong> La app analiza el promedio de luminancia (Y = 0.299R + 0.587G + 0.114B). Si detecta sobreexposición (&gt;175), atenúa la ganancia para evitar que los cítricos se saturen como blanco; si detecta sombra profunda (&lt;75), eleva la ganancia en un 25%.
            </div>
          </div>

          {/* Morfología Matemática */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-amber-400">B. Morfología Matemática y Filtro de Circularidad</h3>
            <p className="text-slate-300 leading-relaxed">
              La máscara binaria obtenida suele tener ruido (hojas amarillas aisladas o destellos solares en cutícula cerosa). Se aplican dos operaciones morfológicas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white block mb-1">Apertura Morfológica:</span>
                <span className="text-slate-400">Erosión seguida de dilatación con kernel 3x3. Desconecta racimos adyacentes de fruta y elimina píxeles de ruido aislados.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white block mb-1">Filtro de Circularidad:</span>
                <span className="text-slate-400">
                  Calcula el cociente isoperimétrico:
                  <code className="block mt-1 font-mono text-amber-300">C = (4 * &pi; * Área) / (Perímetro^2)</code>
                  Un círculo perfecto tiene C &approx; 1.0. Los cítricos tienen C entre 0.60 y 0.95. Hojas alargadas y ramas tienen C &lt; 0.50 y son descartadas automáticamente.
                </span>
              </div>
            </div>
          </div>

          {/* Motor YOLO TF.js */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-emerald-400">C. Motor de Inferencia YOLO TensorFlow.js (WebGL)</h3>
            <p className="text-slate-300 leading-relaxed">
              Para escenarios con follaje intrincado, la app utiliza redes neuronales convolucionales modernas (YOLOv8/YOLO11) ejecutadas en el navegador mediante <strong>WebGL</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong>Tiling 2x2 (Mosaico)</strong>: En árboles altos o tomas lejanas, los frutos miden menos de 15 píxeles en 640x640. El tiling divide la foto en 4 cuadrantes con 15% de solapamiento para detectar fruta pequeña sin perder resolución.</li>
              <li><strong>Non-Maximum Suppression (NMS) vectorizado</strong>: Elimina detecciones duplicadas en los bordes de los mosaicos basándose en el umbral de Intersección sobre Unión (IoU).</li>
            </ul>
          </div>

        </div>
      </section>

      {/* 3. Fundamentos Estadísticos y Agronómicos */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Calculator className="w-5 h-5 text-amber-400" />
          <span>3. Criterios Agronómicos y Fórmulas Estadísticas</span>
        </h2>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          
          {/* Fórmula Muestreo */}
          <div>
            <h4 className="font-bold text-white text-sm mb-1">A. Tamaño de Muestra Representativa (n)</h4>
            <p className="text-slate-400 mb-2">
              En fruticultura de precisión, la carga frutal varía árbol a árbol. La app calcula el Coeficiente de Variación (CV% = desviación estándar / media &times; 100) y determina si el número de árboles evaluados permite estimar la cosecha con error &le; 10% y 95% de confianza:
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-center text-amber-400 text-sm">
              n = [ (1.96 &times; CV) / 10 ]&sup2;
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Si en un cuartel con alta variabilidad (CV = 35%), la fórmula indica n &approx; 47 árboles; si el cuartel es muy homogéneo (CV = 15%), bastan n &approx; 9 árboles. La app avisa en color verde cuando se alcanza la meta.
            </p>
          </div>

          {/* Factor Follaje */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="font-bold text-white text-sm mb-1">B. Factor de Calibración de Follaje (F)</h4>
            <p className="text-slate-400 mb-2">
              Desde el exterior del árbol solo es visible entre el 60% y el 75% de la fruta total; el resto queda oculta en el interior de la copa. El factor de corrección (por defecto 1.35x) proyecta la carga real:
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-center text-slate-200">
              Fruta Total Árbol = Fruta Contada &times; Factor Follaje
            </div>
          </div>

          {/* Kilos y Toneladas */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="font-bold text-white text-sm mb-1">C. Proyección de Rendimiento (t/ha)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-semibold block mb-1 text-white">kg / Árbol:</span>
                <code>(Fruta Total &times; Peso Medio g) / 1000</code>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-semibold block mb-1 text-white">Toneladas / Hectárea:</span>
                <code>(kg/Árbol &times; Densidad Árboles/ha) / 1000</code>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Quick Launch Buttons */}
      <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-400">¿Listo para comenzar a medir en terreno?</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('camera')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Ir a Cámara en Vivo</span>
          </button>
          <button
            onClick={() => onNavigateTab('yield')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Ver Rendimiento</span>
          </button>
        </div>
      </div>

    </div>
  );
};
