import React, { useState, useEffect, useRef } from 'react';
import { Sliders, RotateCcw, Check, Sun, Sparkles, Pipette, ZoomIn, ZoomOut, Maximize, X } from 'lucide-react';
import { HsvFilterParams } from '../../types/citrus';
import { colorDetector, ColorDetectionResult } from '../../services/vision/colorDetector';
import { DEFAULT_HSV_ORANGE, DEFAULT_HSV_LEMON } from '../../services/db';

type Sample = { nx: number; ny: number; h: number; s: number; v: number };
const MAX_ZOOM = 8;
const DISPLAY_MAX_PX = 1600; // el canvas de pantalla se reduce; el detector ya trabaja a 480 px

/** Rango HSV que cubre las muestras tocadas, con margen para la variación de luz. */
function rangeFromSamples(samples: Sample[]) {
  const hs = samples.map(x => x.h), ss = samples.map(x => x.s), vs = samples.map(x => x.v);
  return {
    hMin: Math.max(0, Math.floor(Math.min(...hs) - 10)),
    hMax: Math.min(360, Math.ceil(Math.max(...hs) + 10)),
    sMin: Math.max(0, Math.floor(Math.min(...ss) - 15)),
    sMax: 100,
    vMin: Math.max(0, Math.floor(Math.min(...vs) - 20)),
    vMax: 100,
  };
}

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

  // Zoom / desplazamiento propios (la imagen nunca sale por completo del recuadro)
  const viewportRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ cw: 0, ch: 0 });
  const [view, setView] = useState({ z: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({
    moved: false, multi: false,
    down: { x: 0, y: 0 }, last: { x: 0, y: 0 },
    startDist: 1, startZ: 1, startMid: { x: 0, y: 0 }, startT: { x: 0, y: 0 },
  });

  // Cuentagotas: colores tomados tocando frutos
  const [samples, setSamples] = useState<Sample[]>([]);
  const samplesRef = useRef<Sample[]>([]);
  const [sampling, setSampling] = useState(false);

  const fit = imgSize.w && box.cw ? Math.min(box.cw / imgSize.w, box.ch / imgSize.h) : 1;
  const dw = imgSize.w * fit;
  const dh = imgSize.h * fit;

  const clampView = (z: number, tx: number, ty: number) => {
    const sw = dw * z, sh = dh * z;
    return {
      z,
      tx: sw <= box.cw ? (box.cw - sw) / 2 : Math.min(0, Math.max(box.cw - sw, tx)),
      ty: sh <= box.ch ? (box.ch - sh) / 2 : Math.min(0, Math.max(box.ch - sh, ty)),
    };
  };
  const applyView = (v: { z: number; tx: number; ty: number }) => { viewRef.current = v; setView(v); };
  const zoomAt = (newZ: number, px: number, py: number) => {
    const v = viewRef.current;
    const z = Math.min(MAX_ZOOM, Math.max(1, newZ));
    const ix = (px - v.tx) / v.z, iy = (py - v.ty) / v.z;
    applyView(clampView(z, px - ix * z, py - iy * z));
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ cw: el.clientWidth, ch: el.clientHeight }));
    ro.observe(el);
    setBox({ cw: el.clientWidth, ch: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Al cambiar la foto o el tamaño del recuadro, la imagen vuelve a encajar entera
  useEffect(() => { applyView(clampView(1, 0, 0)); }, [box.cw, box.ch, imgSize.w, imgSize.h]);

  // Rueda del mouse (escritorio): zoom hacia el puntero
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(viewRef.current.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

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
      setImgSize({ w: img.width, h: img.height });
      samplesRef.current = [];
      setSamples([]);
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

    const dispScale = Math.min(1, DISPLAY_MAX_PX / Math.max(img.width, img.height));
    const cw = Math.max(1, Math.round(img.width * dispScale));
    const ch = Math.max(1, Math.round(img.height * dispScale));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'original') {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else if (viewMode === 'mask') {
      // Black background + mask
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (result.maskCanvas) {
        ctx.drawImage(result.maskCanvas, 0, 0, canvas.width, canvas.height);
      }
    } else {
      // Overlay
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

    // Marcas de las muestras tomadas con el cuentagotas
    for (const m of samplesRef.current) {
      const r = Math.max(8, Math.round(canvas.width * 0.012));
      ctx.lineWidth = Math.max(2, Math.round(canvas.width * 0.003));
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(m.nx * canvas.width, m.ny * canvas.height, r + ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(m.nx * canvas.width, m.ny * canvas.height, r, 0, Math.PI * 2); ctx.stroke();
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
    samplesRef.current = [];
    setSamples([]);
    setLocalParams(preset);
    onChangeParams(preset);
    runPreview(preset);
  };

  const handleTap = (clientX: number, clientY: number) => {
    const img = imageObjRef.current;
    const el = viewportRef.current;
    if (!img || !el) return;
    const rect = el.getBoundingClientRect();
    const v = viewRef.current;
    const nx = (clientX - rect.left - v.tx) / (dw * v.z);
    const ny = (clientY - rect.top - v.ty) / (dh * v.z);
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
    const hsv = colorDetector.sampleHsv(img, img.width, img.height, nx, ny, localParams.adaptiveLuminance);
    if (!hsv) return;
    const next = [...samplesRef.current, { nx, ny, ...hsv }];
    samplesRef.current = next;
    setSamples(next);
    const updated = { ...localParams, ...rangeFromSamples(next) };
    setLocalParams(updated);
    onChangeParams(updated);
    runPreview(updated);
  };

  const clearSamples = () => {
    samplesRef.current = [];
    setSamples([]);
    if (detectionResult) drawComposite(detectionResult);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.moved = false; g.multi = false;
      g.down = { x: e.clientX, y: e.clientY };
      g.last = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      const rect = e.currentTarget.getBoundingClientRect();
      const [a, b] = Array.from(pointers.current.values());
      g.multi = true;
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.startZ = viewRef.current.z;
      g.startMid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      g.startT = { x: viewRef.current.tx, y: viewRef.current.ty };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size >= 2) {
      const rect = e.currentTarget.getBoundingClientRect();
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2 - rect.left, my = (a.y + b.y) / 2 - rect.top;
      const z = Math.min(MAX_ZOOM, Math.max(1, g.startZ * dist / g.startDist));
      const ix = (g.startMid.x - g.startT.x) / g.startZ, iy = (g.startMid.y - g.startT.y) / g.startZ;
      applyView(clampView(z, mx - ix * z, my - iy * z));
      return;
    }
    const dx = e.clientX - g.last.x, dy = e.clientY - g.last.y;
    g.last = { x: e.clientX, y: e.clientY };
    if (!g.moved && Math.hypot(e.clientX - g.down.x, e.clientY - g.down.y) > 6) g.moved = true;
    if (g.moved) {
      const v = viewRef.current;
      applyView(clampView(v.z, v.tx + dx, v.ty + dy));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const had = pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (had && e.type === 'pointerup' && !g.moved && !g.multi && sampling) handleTap(e.clientX, e.clientY);
    if (pointers.current.size === 1) {
      // Quedó un dedo tras el pellizco: sigue desde donde está, sin saltos ni toques falsos
      const [r] = Array.from(pointers.current.values());
      g.last = { ...r }; g.down = { ...r }; g.moved = true;
    }
    if (pointers.current.size === 0) g.multi = false;
  };

  const handleSave = () => {
    onSaveDefault(localParams);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
      
      {/* Left: Interactive Canvas Preview (fija arriba en el móvil: ves el efecto mientras ajustas) */}
      <div className="sticky top-0 z-10 lg:top-4 lg:self-start flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {/* View Mode Toolbar */}
        <div className="p-2 sm:p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 sm:gap-1 p-1 bg-slate-900 rounded-lg font-medium">
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-2 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs transition-colors cursor-pointer ${
                viewMode === 'overlay' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Superposición
            </button>
            <button
              onClick={() => setViewMode('mask')}
              className={`px-2 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs transition-colors cursor-pointer ${
                viewMode === 'mask' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Máscara<span className="hidden sm:inline"> Binaria</span>
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-2 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs transition-colors cursor-pointer ${
                viewMode === 'original' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Original
            </button>
          </div>
          {/* Quick Metrics */}
          {detectionResult && (
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono whitespace-nowrap">
              <span>Frutos: <strong className="text-amber-400">{detectionResult.boxes.length}</strong></span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{detectionResult.processTimeMs} ms</span>
            </div>
          )}
        </div>

        {/* Barra de controles: fuera de la imagen para no confundir los toques sobre los frutos */}
        <div className="px-2 py-1.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => setSampling(v => !v)}
              aria-pressed={sampling}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                sampling
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-900 text-slate-200 border-slate-700'
              }`}
            >
              <Pipette className="w-3.5 h-3.5 shrink-0" />
              <span>{sampling ? (samples.length ? 'Muestreando' : 'Toca un fruto') : 'Muestrear fruta'}</span>
            </button>
            {samples.length > 0 && (
              <button
                onClick={clearSamples}
                aria-label="Borrar muestras"
                className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <span>{samples.length}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden min-[400px]:inline px-1 text-[11px] font-mono text-slate-400 tabular-nums">{Math.round(view.z * 100)}%</span>
            <button
              onClick={() => zoomAt(viewRef.current.z / 1.5, box.cw / 2, box.ch / 2)}
              aria-label="Alejar"
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoomAt(viewRef.current.z * 1.5, box.cw / 2, box.ch / 2)}
              aria-label="Acercar"
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyView(clampView(1, 0, 0))}
              aria-label="Ajustar a la pantalla"
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Display: pellizcar para ampliar, arrastrar para mover */}
        <div
          ref={viewportRef}
          className="relative h-[30dvh] min-h-[170px] lg:h-[560px] overflow-hidden bg-slate-950 select-none"
          style={{ touchAction: 'none', cursor: sampling ? 'crosshair' : view.z > 1 ? 'grab' : 'default' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            style={{
              position: 'absolute', left: 0, top: 0, width: dw, height: dh,
              transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.z})`,
              transformOrigin: '0 0',
            }}
          >
            <canvas ref={canvasRef} style={{ width: dw, height: dh, display: 'block' }} />
          </div>

          {!imageDataUrl && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-400">
              Carga una foto con «Cargar Foto» para calibrar.
            </div>
          )}
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
