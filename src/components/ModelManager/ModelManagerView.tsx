import React, { useState, useRef } from 'react';
import { Cpu, Upload, CheckCircle2, AlertCircle, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import { yoloDetector } from '../../services/vision/yoloDetector';
import { YoloModelConfig } from '../../types/citrus';

interface ModelManagerViewProps {
  onModelLoaded: () => void;
}

export const ModelManagerView: React.FC<ModelManagerViewProps> = ({ onModelLoaded }) => {
  const [config, setConfig] = useState<YoloModelConfig>(yoloDetector.getConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      await yoloDetector.loadUserFiles(files);
      const updated = yoloDetector.getConfig();
      setConfig(updated);
      setFeedback({
        type: 'success',
        message: `Modelo "${updated.activeModelName}" cargado y pre-calentado exitosamente en WebGL.`,
      });
      onModelLoaded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateThresholds = (conf: number, iou: number, tile: 1 | 2) => {
    yoloDetector.setThresholds(conf, iou, tile);
    setConfig(yoloDetector.getConfig());
  };

  const colabScript = `# ==============================================================================
# Script de Entrenamiento Ultralytics YOLOv8/11 para Detección de Cítricos
# ==============================================================================
# Paso 1: Instala Ultralytics y dependencias de conversión
!pip install -q ultralytics tensorflow tensorflowjs

# Paso 2: Sube o descomprime el archivo ZIP exportado desde CitrusVision
# !unzip -q /content/dataset_citricos_yolo.zip -d /content/dataset

from ultralytics import YOLO

# Paso 3: Inicializa modelo preentrenado (YOLOv8n o YOLO11n recomendado para web)
model = YOLO('yolov8n.pt')

# Paso 4: Entrena el modelo en GPU
results = model.train(
    data='/content/dataset/data.yaml',
    epochs=50,
    imgsz=640,
    batch=16,
    device=0,
    plots=True
)

# Paso 5: Exporta directamente a TensorFlow.js (Graph Model)
model.export(format='tfjs', imgsz=640)

print("¡Listo! Descarga la carpeta generada (con model.json y archivos .bin) y cárgala en CitrusVision.")
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(colabScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      
      {/* Title */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-6 h-6 text-emerald-400" />
          <span>Gestión de Modelos YOLO y Parámetros de Inferencia</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Carga modelos TensorFlow.js propios exportados desde Ultralytics YOLOv8/YOLO11 o utiliza el detector calibrado integrado.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Model Loader & Thresholds */}
        <div className="space-y-6">
          
          {/* Active Model Status Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Modelo Activo</span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Backend WebGL Listo</span>
              </div>
            </div>

            <div className="text-lg font-bold text-white">
              {config.activeModelName}
            </div>

            <div className="text-xs text-slate-400">
              {config.isLoaded
                ? 'Modelo personalizado en ejecución en memoria GPU local.'
                : 'Detector integrado calibrado para cítricos con heurística multi-escala y supresión NMS.'}
            </div>
          </div>

          {/* Upload Custom Weights */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/50 text-center transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".json,.bin"
              onChange={handleFiles}
              className="hidden"
            />

            <Upload className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Cargar Modelo Propio (TF.js)</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Selecciona todos los archivos del modelo: <strong>model.json</strong> y todos los fragmentos <strong>.bin</strong>.
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isLoading ? 'Cargando y caldeando tensores...' : 'Seleccionar Archivos de Modelo'}
            </button>

            {feedback && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 text-left ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>

          {/* Inference Thresholds Form */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Umbrales de Detección</h3>

            {/* Confianza */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Umbral de Confianza (Confidence)</span>
                <span className="font-mono text-emerald-400 font-semibold">{Math.round(config.confThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.85"
                step="0.05"
                value={config.confThreshold}
                onChange={e => updateThresholds(parseFloat(e.target.value), config.iouThreshold, config.tileGrid)}
                className="w-full"
              />
              <span className="text-[10px] text-slate-500 block">
                Valores bajos aumentan el recall (detectan más fruta parcialmente oculta).
              </span>
            </div>

            {/* IoU NMS */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Supresión No Máximos (IoU NMS)</span>
                <span className="font-mono text-emerald-400 font-semibold">{Math.round(config.iouThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.75"
                step="0.05"
                value={config.iouThreshold}
                onChange={e => updateThresholds(config.confThreshold, parseFloat(e.target.value), config.tileGrid)}
                className="w-full"
              />
              <span className="text-[10px] text-slate-500 block">
                Elimina cajas redundantes que solapan sobre el mismo fruto.
              </span>
            </div>

            {/* Tiling Mode */}
            <div className="space-y-1.5 text-xs pt-2 border-t border-slate-800">
              <label className="text-slate-300 block mb-1.5 font-medium">Estrategia de Tiling (Mosaico)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateThresholds(config.confThreshold, config.iouThreshold, 1)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
                    config.tileGrid === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <div className="font-bold">1x1 (Imagen Completa)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Máxima velocidad (30-50ms)</div>
                </button>

                <button
                  onClick={() => updateThresholds(config.confThreshold, config.iouThreshold, 2)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
                    config.tileGrid === 2
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <div className="font-bold">2x2 (Mosaico 4 cuadrantes)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Detecta cítricos pequeños y lejanos</div>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Right: Google Colab Training Notebook Script */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Guía de Entrenamiento en Google Colab</h3>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '¡Copiado!' : 'Copiar Script'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Puedes entrenar un modelo YOLOv8 o YOLO11 en Google Colab con aceleración GPU gratuita utilizando el dataset ZIP exportado desde esta app:
            </p>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-80 scrollbar-thin">
              <pre>{colabScript}</pre>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>¿Listo para entrenar en la nube?</span>
            <a
              href="https://colab.research.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>Abrir Google Colab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

      </div>

    </div>
  );
};
