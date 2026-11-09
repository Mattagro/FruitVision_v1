import React, { useState, useEffect, useRef } from 'react';
import { Sliders, RotateCcw, Check, Sun, Sparkles } from 'lucide-react';
import { HsvFilterParams } from '../../types/citrus';
import { colorDetector, ColorDetectionResult } from '../../services/vision/colorDetector';
import { DEFAULT_HSV_ORANGE, DEFAULT_HSV_LEMON } from '../../services/db';

interface HSVAdjusterProps {
  imageDataUrl: string | null;
  params: HsvFilterParams;
  onChangeParams: (newParams: HsvFilterParams) => void;
  onSaveDefault: (params: HsvFilterParams) => void;
}

export const HSVAdjuster: React.FC<HSVAdjusterProps> = ({
  imageDataUrl,
  params,
  onChangeParams,
  onSaveDefault,
}) => {
  const [localParams, setLocalParams] = useState<HsvFilterParams>(params);
  const [detectionResult, setDetectionResult] = useState<ColorDetectionResult | null>(null);
  const [viewMode, setViewMode] = useState<'overlay' | 'mask' | 'original'>('overlay');
  const [savedNotice, setSavedNotice] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Sync prop changes
  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  // Load image
  useEffect(() => {
    if (!imageDataUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageDataUrl;
    img.onload = () => {
      imageObjRef.current = img;
      runPreview(localParams);
    };
  }, [imageDataUrl]);

  // Run preview detection
  const runPreview = (currentParams: HsvFilterParams) => {
    const img = imageObjRef.current;
    if (!img) return;

    const result = colorDetector.detect(img, img.width, img.height, currentParams, true);
    setDetectionResult(result);
    drawComposite(result);
  };

  // Draw composite canvas based on view mode
  const drawComposite = (result: ColorDetectionResult) => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'original') {
      ctx.drawImage(img, 0, 0);
    } else if (viewMode === 'mask') {
      // Black background + mask
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (result.maskCanvas) {
        ctx.drawImage(result.maskCanvas, 0, 0, canvas.width, canvas.height);
      }
    } else {
      // Overlay
      ctx.drawImage(img, 0, 0);
      if (result.maskCanvas) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.drawImage(result.maskCanvas, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Draw bounding boxes on top
      for (const b of result.boxes) {
        const bx = b.x * canvas.width;
        const by = b.y * canvas.height;
        const bw = b.width * canvas.width;
        const bh = b.height * canvas.height;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(2, Math.round(canvas.width * 0.003));
        ctx.strokeRect(bx, by, bw, bh);

        // Circularity label
        ctx.fillStyle = '#38bdf8';
        ctx.font = `600 ${Math.max(12, Math.round(canvas.width * 0.014))}px monospace`;
        if (b.circularity) {
          ctx.fillText(`C: ${b.circularity}`, bx + 4, Math.max(14, by - 4));
        }
      }
    }
  };

  useEffect(() => {
    if (detectionResult) {
      drawComposite(detectionResult);
    }
  }, [viewMode]);

  const updateParam = <K extends keyof HsvFilterParams>(key: K, value: HsvFilterParams[K]) => {
    const updated = { ...localParams, [key]: value };
    setLocalParams(updated);
    onChangeParams(updated);
    runPreview(updated);
  };

  const applyPreset = (preset: HsvFilterParams) => {
    setLocalParams(preset);
    onChangeParams(preset);
    runPreview(preset);
  };

  const handleSave = () => {
    onSaveDefault(localParams);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
      
      {/* Left: Interactive Canvas Preview */}
      <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        
        {/* View Mode Toolbar */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg text-xs font-medium">
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'overlay' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Superposición
            </button>
            <button
              onClick={() => setViewMode('mask')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'mask' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Máscara Binaria
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'original' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Original
            </button>
          </div>

          {/* Quick Metrics */}
          {detectionResult && (
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>Frutos: <strong className="text-amber-400">{detectionResult.boxes.length}</strong></span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{detectionResult.processTimeMs} ms</span>
            </div>
          )}
        </div>

        {/* Canvas Display */}
        <div className="relative flex-1 min-h-[380px] lg:min-h-[500px] flex items-center justify-center p-2 bg-slate-950">
          <canvas ref={canvasRef} className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md" />
        </div>

      </div>

      {/* Right: Sliders & Preset Panel */}
      <div className="w-full lg:w-96 flex flex-col gap-5 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Calibración HSV</h3>
          </div>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{savedNotice ? 'Guardado' : 'Guardar'}</span>
          </button>
        </div>

        {/* Presets */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2">Perfiles de Cítricos</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => applyPreset(DEFAULT_HSV_ORANGE)}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-left transition-colors cursor-pointer"
            >
              🍊 Naranja Valencia
            </button>
            <button
              onClick={() => applyPreset(DEFAULT_HSV_LEMON)}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-yellow-500/30 text-left transition-colors cursor-pointer"
            >
              🍋 Limón Eureka
            </button>
            <button
              onClick={() => applyPreset({
                ...DEFAULT_HSV_ORANGE,
                hMin: 12,
                hMax: 36,
                sMin: 45,
                minCircularity: 0.60,
              })}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 border border-orange-500/30 text-left transition-colors cursor-pointer"
            >
              🍊 Mandarina Murcott
            </button>
            <button
              onClick={() => applyPreset({
                ...DEFAULT_HSV_ORANGE,
                hMin: 10,
                hMax: 32,
                sMin: 50,
                minCircularity: 0.62,
              })}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-left transition-colors cursor-pointer"
            >
              🍊 Clementina / Oronules
            </button>
            <button
              onClick={() => applyPreset({
                ...DEFAULT_HSV_ORANGE,
                hMin: 0,
                hMax: 18,
                sMin: 35,
                minCircularity: 0.58,
                minRadius: 12,
              })}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 text-left transition-colors cursor-pointer"
            >
              🔴 Pomelo Star Ruby
            </button>
            <button
              onClick={() => applyPreset({
                ...DEFAULT_HSV_ORANGE,
                hMin: 25,
                hMax: 60,
                sMin: 25,
                vMin: 35,
                minCircularity: 0.50,
              })}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-lime-400 border border-lime-500/30 text-left transition-colors cursor-pointer"
            >
              🟢 Envero (Verdeante)
            </button>
          </div>
        </div>

        {/* Sliders Container */}
        <div className="space-y-4 text-xs">
          
          {/* Matiz (Hue) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>Matiz (Hue) Mín - Máx</span>
              <span className="font-mono text-amber-400 font-semibold">{localParams.hMin}° — {localParams.hMax}°</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="range"
                min="0"
                max="360"
                value={localParams.hMin}
                onChange={e => updateParam('hMin', parseInt(e.target.value))}
              />
              <input
                type="range"
                min="0"
                max="360"
                value={localParams.hMax}
                onChange={e => updateParam('hMax', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Saturación (Saturation) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>Saturación Mínima</span>
              <span className="font-mono text-amber-400 font-semibold">{localParams.sMin}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={localParams.sMin}
              onChange={e => updateParam('sMin', parseInt(e.target.value))}
            />
          </div>

          {/* Brillo / Luminancia (Value) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>Brillo Mínimo (Value)</span>
              <span className="font-mono text-amber-400 font-semibold">{localParams.vMin}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="85"
              value={localParams.vMin}
              onChange={e => updateParam('vMin', parseInt(e.target.value))}
            />
          </div>

          {/* Filtro de Circularidad Geométrica */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>Circularidad Mínima</span>
              <span className="font-mono text-amber-400 font-semibold">{localParams.minCircularity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.85"
              step="0.02"
              value={localParams.minCircularity}
              onChange={e => updateParam('minCircularity', parseFloat(e.target.value))}
            />
            <p className="text-[10px] text-slate-500">
              Valores altos (&gt;0.60) descartan eficazmente hojas y ramas alargadas.
            </p>
          </div>

          {/* Tamaño / Radio Mín y Máx */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span>Radio Mín - Máx (px)</span>
              <span className="font-mono text-amber-400 font-semibold">{localParams.minRadius}px — {localParams.maxRadius}px</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="range"
                min="4"
                max="30"
                value={localParams.minRadius}
                onChange={e => updateParam('minRadius', parseInt(e.target.value))}
              />
              <input
                type="range"
                min="35"
                max="120"
                value={localParams.maxRadius}
                onChange={e => updateParam('maxRadius', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Compensación de Iluminación */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-medium text-slate-200 block">Normalización de Luz</span>
                <span className="text-[10px] text-slate-500">Compensa sol directo o sombra densa</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={localParams.adaptiveLuminance}
              onChange={e => updateParam('adaptiveLuminance', e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded"
            />
          </div>

        </div>

      </div>

    </div>
  );
};
