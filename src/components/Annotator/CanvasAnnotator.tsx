import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, Trash2, 
  Sparkles, Cpu, Save, Plus, Move, 
  MapPin, Check, ChevronDown, ChevronUp 
} from 'lucide-react';
import { BoundingBox, CaptureMetadata, HsvFilterParams } from '../../types/citrus';
import { colorDetector } from '../../services/vision/colorDetector';
import { yoloDetector } from '../../services/vision/yoloDetector';
import { getCurrentDeviceLocation } from '../../services/exif';

interface CanvasAnnotatorProps {
  imageDataUrl: string | null;
  initialBoxes: BoundingBox[];
  metadata: CaptureMetadata;
  hsvParams: HsvFilterParams;
  onSaveCapture: (boxes: BoundingBox[], metadata: CaptureMetadata) => void;
  onOpenLiveCamera: () => void;
}

export const CanvasAnnotator: React.FC<CanvasAnnotatorProps> = ({
  imageDataUrl,
  initialBoxes,
  metadata: initialMetadata,
  hsvParams,
  onSaveCapture,
  onOpenLiveCamera,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Boxes & History state
  const [boxes, setBoxes] = useState<BoundingBox[]>(initialBoxes);
  const [history, setHistory] = useState<BoundingBox[][]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'draw' | 'select' | 'pan'>('draw');

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);

  // Orchard metadata state
  const [metadata, setMetadata] = useState<CaptureMetadata>(initialMetadata);
  const [showMetaPanel, setShowMetaPanel] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Loading indicator for detections
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionNotice, setDetectionNotice] = useState<string | null>(null);

  // Sync initialBoxes when prop changes
  useEffect(() => {
    setBoxes(initialBoxes);
    setHistory([]);
  }, [initialBoxes, imageDataUrl]);

  // Push history before state changes
  const pushHistory = (newBoxes: BoundingBox[]) => {
    setHistory(prev => [...prev.slice(-15), boxes]);
    setBoxes(newBoxes);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setBoxes(prev);
    setSelectedBoxId(null);
  };

  // Load image object
  useEffect(() => {
    if (!imageDataUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageDataUrl;
    img.onload = () => {
      imageObjRef.current = img;
      // Auto center and fit
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const fitScale = Math.min((cw - 32) / img.width, (ch - 32) / img.height, 1);
        setScale(Math.max(0.2, fitScale));
        setPan({
          x: Math.round((cw - img.width * fitScale) / 2),
          y: Math.round((ch - img.height * fitScale) / 2),
        });
      }
      renderCanvas();
    };
  }, [imageDataUrl]);

  // Render Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    // Draw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw Bounding Boxes
    const iw = canvas.width;
    const ih = canvas.height;

    boxes.forEach(b => {
      const bx = b.x * iw;
      const by = b.y * ih;
      const bw = b.width * iw;
      const bh = b.height * ih;

      const isSelected = b.id === selectedBoxId;

      ctx.strokeStyle = isSelected ? '#38bdf8' : (b.colorHex || '#f59e0b');
      ctx.lineWidth = Math.max(3, Math.round(iw * 0.003));
      ctx.strokeRect(bx, by, bw, bh);

      // Semi-transparent fill for selected
      if (isSelected) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.fillRect(bx, by, bw, bh);
      }

      // Small label
      ctx.fillStyle = isSelected ? '#38bdf8' : (b.colorHex || '#f59e0b');
      ctx.font = `600 ${Math.max(13, Math.round(iw * 0.015))}px 'JetBrains Mono', monospace`;
      const label = b.confidence ? `${Math.round(b.confidence * 100)}%` : 'Manual';
      ctx.fillText(label, bx + 4, Math.max(16, by - 6));
    });
  }, [boxes, selectedBoxId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer / Mouse events on canvas wrapper
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const img = imageObjRef.current;
    if (!container || !img) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert screen coordinates to normalized image coordinates [0, 1]
    const imgX = (clientX - pan.x) / (img.width * scale);
    const imgY = (clientY - pan.y) / (img.height * scale);

    if (activeTool === 'pan' || e.button === 1 || e.shiftKey) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: clientX - pan.x, y: clientY - pan.y };
      return;
    }

    if (activeTool === 'select') {
      // Check if clicked inside any existing box (search backwards for topmost)
      let foundId: string | null = null;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (imgX >= b.x && imgX <= b.x + b.width && imgY >= b.y && imgY <= b.y + b.height) {
          foundId = b.id;
          break;
        }
      }
      setSelectedBoxId(foundId);
      return;
    }

    if (activeTool === 'draw') {
      if (imgX >= 0 && imgX <= 1 && imgY >= 0 && imgY <= 1) {
        drawStartRef.current = { x: imgX, y: imgY };
        isDraggingRef.current = true;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const img = imageObjRef.current;
    if (!container || !img || !isDraggingRef.current) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (activeTool === 'pan' || e.shiftKey) {
      setPan({
        x: clientX - dragStartRef.current.x,
        y: clientY - dragStartRef.current.y,
      });
      return;
    }

    // Dynamic drawing preview
    if (activeTool === 'draw' && drawStartRef.current) {
      renderCanvas();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currImgX = Math.max(0, Math.min(1, (clientX - pan.x) / (img.width * scale)));
      const currImgY = Math.max(0, Math.min(1, (clientY - pan.y) / (img.height * scale)));

      const minX = Math.min(drawStartRef.current.x, currImgX) * img.width;
      const minY = Math.min(drawStartRef.current.y, currImgY) * img.height;
      const w = Math.abs(currImgX - drawStartRef.current.x) * img.width;
      const h = Math.abs(currImgY - drawStartRef.current.y) * img.height;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(3, Math.round(img.width * 0.003));
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(minX, minY, w, h);
      ctx.setLineDash([]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;

    if (activeTool === 'draw' && drawStartRef.current) {
      const container = containerRef.current;
      const img = imageObjRef.current;
      if (container && img) {
        const rect = container.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const currImgX = Math.max(0, Math.min(1, (clientX - pan.x) / (img.width * scale)));
        const currImgY = Math.max(0, Math.min(1, (clientY - pan.y) / (img.height * scale)));

        const minX = Math.min(drawStartRef.current.x, currImgX);
        const minY = Math.min(drawStartRef.current.y, currImgY);
        const w = Math.abs(currImgX - drawStartRef.current.x);
        const h = Math.abs(currImgY - drawStartRef.current.y);

        // Minimum box size threshold (at least 0.8% of image)
        if (w > 0.008 && h > 0.008) {
          const newBox: BoundingBox = {
            id: `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            x: Number(minX.toFixed(4)),
            y: Number(minY.toFixed(4)),
            width: Number(w.toFixed(4)),
            height: Number(h.toFixed(4)),
            classId: 0,
            className: metadata.variedad || 'Cítrico',
            confidence: 1.0,
            source: 'manual',
            colorHex: '#38bdf8',
          };
          pushHistory([...boxes, newBox]);
          setSelectedBoxId(newBox.id);
        }
      }
      drawStartRef.current = null;
      renderCanvas();
    }
  };

  // Zoom handling with wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale(s => Math.min(5, Math.max(0.15, s * zoomFactor)));
  };

  // Run Adaptive HSV Color Detector
  const handleRunColorDetection = () => {
    const img = imageObjRef.current;
    if (!img) return;

    setIsDetecting(true);
    setDetectionNotice('Ejecutando algoritmo HSV adaptativo...');

    setTimeout(() => {
      const result = colorDetector.detect(img, img.width, img.height, hsvParams, false);
      pushHistory(result.boxes);
      setIsDetecting(false);
      setDetectionNotice(`Detección por color: ${result.boxes.length} frutos encontrados en ${result.processTimeMs}ms`);
      setTimeout(() => setDetectionNotice(null), 3000);
    }, 50);
  };

  // Run YOLO Detector
  const handleRunYoloDetection = async () => {
    const img = imageObjRef.current;
    if (!img) return;

    setIsDetecting(true);
    setDetectionNotice('Ejecutando inferencia YOLO con aceleración WebGL...');

    try {
      const result = await yoloDetector.detect(img, img.width, img.height);
      pushHistory(result.boxes);
      setDetectionNotice(`Inferencia YOLO: ${result.boxes.length} frutos detectados en ${result.processTimeMs}ms`);
    } catch (e) {
      setDetectionNotice(`Error al ejecutar modelo: ${String(e)}`);
    } finally {
      setIsDetecting(false);
      setTimeout(() => setDetectionNotice(null), 3500);
    }
  };

  // Delete selected box
  const handleDeleteSelected = () => {
    if (!selectedBoxId) return;
    pushHistory(boxes.filter(b => b.id !== selectedBoxId));
    setSelectedBoxId(null);
  };

  // Clear all boxes
  const handleClearAll = () => {
    if (boxes.length === 0) return;
    pushHistory([]);
    setSelectedBoxId(null);
  };

  // Fetch current GPS
  const handleFetchGps = async () => {
    setIsGpsLoading(true);
    const loc = await getCurrentDeviceLocation();
    if (loc) {
      setMetadata(prev => ({
        ...prev,
        gps: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        },
      }));
    }
    setIsGpsLoading(false);
  };

  // Save capture
  const handleSave = () => {
    onSaveCapture(boxes, metadata);
  };

  if (!imageDataUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <p className="text-slate-400 mb-4">No hay ninguna imagen cargada actualmente para anotar.</p>
        <button
          onClick={onOpenLiveCamera}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-all cursor-pointer"
        >
          Abrir Cámara en Vivo
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-slate-950 overflow-hidden">
      
      {/* Main Canvas Viewport Area */}
      <div className="relative flex-1 h-full flex flex-col overflow-hidden">
        
        {/* Floating Top Canvas Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          
          {/* Tool switchers */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 pointer-events-auto shadow-lg">
            <button
              onClick={() => setActiveTool('draw')}
              className={`p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTool === 'draw' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Dibujar Caja (Arrastrar sobre el fruto)"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Dibujar</span>
            </button>

            <button
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTool === 'select' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Seleccionar Caja"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Seleccionar</span>
            </button>

            <button
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTool === 'pan' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Mover / Desplazar Imagen"
            >
              <Move className="w-4 h-4" />
              <span className="hidden sm:inline">Mover</span>
            </button>

            <div className="w-px h-5 bg-slate-800 mx-1" />

            <button
              onClick={undo}
              disabled={history.length === 0}
              className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Deshacer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {selectedBoxId && (
              <button
                onClick={handleDeleteSelected}
                className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                title="Eliminar Caja Seleccionada"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Stats & AI Triggers */}
          <div className="flex items-center gap-2 pointer-events-auto">
            
            {/* Fruit Count Pill */}
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs font-mono text-white flex items-center gap-2 shadow-lg">
              <span className="text-slate-400">Total:</span>
              <span className="text-base font-bold text-amber-400 tabular-nums">{boxes.length}</span>
            </div>

            {/* Run HSV Detection */}
            <button
              onClick={handleRunColorDetection}
              disabled={isDetecting}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Color HSV</span>
            </button>

            {/* Run YOLO Model */}
            <button
              onClick={handleRunYoloDetection}
              disabled={isDetecting}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <Cpu className="w-4 h-4" />
              <span className="hidden sm:inline">YOLO TF.js</span>
            </button>

          </div>
        </div>

        {/* Status Notification Toast */}
        {detectionNotice && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-slate-900/95 border border-slate-700 text-xs text-slate-200 shadow-xl backdrop-blur-md">
            {detectionNotice}
          </div>
        )}

        {/* Interactive Canvas Container */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className={`flex-1 w-full h-full relative overflow-hidden bg-slate-950 select-none touch-none ${
            activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : activeTool === 'draw' ? 'cursor-crosshair' : 'cursor-default'
          }`}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              position: 'absolute',
            }}
          >
            <canvas ref={canvasRef} className="block shadow-2xl rounded-sm" />
          </div>
        </div>

        {/* Bottom Zoom & Meta Toggle Bar */}
        <div className="h-14 px-4 border-t border-slate-900 bg-slate-950 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale(s => Math.max(0.2, s * 0.85))}
              className="p-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Reducir Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 w-12 text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(4, s * 1.15))}
              className="p-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const img = imageObjRef.current;
                const cw = containerRef.current?.clientWidth || 800;
                const ch = containerRef.current?.clientHeight || 600;
                if (img) {
                  const fit = Math.min((cw - 32) / img.width, (ch - 32) / img.height, 1);
                  setScale(fit);
                  setPan({
                    x: Math.round((cw - img.width * fit) / 2),
                    y: Math.round((ch - img.height * fit) / 2),
                  });
                }
              }}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Ajustar
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 transition-colors cursor-pointer"
            >
              Limpiar Cajas
            </button>

            <button
              onClick={() => setShowMetaPanel(v => !v)}
              className="lg:hidden text-xs text-amber-400 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 cursor-pointer"
            >
              <span>Metadatos</span>
              {showMetaPanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Captura</span>
            </button>
          </div>
        </div>

      </div>

      {/* Right Orchard Metadata Sidebar (Responsive drawer on mobile) */}
      <div
        className={`${
          showMetaPanel ? 'flex' : 'hidden lg:flex'
        } w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90 backdrop-blur-md flex-col h-auto lg:h-full overflow-y-auto p-4 z-30`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h3 className="text-sm font-bold text-white">Contexto de Muestreo</h3>
          <span className="text-xs text-slate-500 font-mono">ID: {metadata.id.slice(-6)}</span>
        </div>

        <div className="space-y-3.5 text-xs">
          
          {/* Predio y Cuartel */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Predio</label>
              <input
                type="text"
                value={metadata.predio}
                onChange={e => setMetadata(m => ({ ...m, predio: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Cuartel</label>
              <input
                type="text"
                value={metadata.cuartel}
                onChange={e => setMetadata(m => ({ ...m, cuartel: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Hilera y Árbol */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Hilera</label>
              <input
                type="text"
                value={metadata.hilera}
                onChange={e => setMetadata(m => ({ ...m, hilera: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Árbol N°</label>
              <input
                type="text"
                value={metadata.arbol}
                onChange={e => setMetadata(m => ({ ...m, arbol: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Cara</label>
              <select
                value={metadata.cara}
                onChange={e => setMetadata(m => ({ ...m, cara: e.target.value as any }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 outline-none"
              >
                <option value="Total">Total</option>
                <option value="N">Norte</option>
                <option value="S">Sur</option>
                <option value="E">Oriente</option>
                <option value="O">Poniente</option>
              </select>
            </div>
          </div>

          {/* Variedad y Etapa */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Variedad</label>
              <select
                value={metadata.variedad}
                onChange={e => setMetadata(m => ({ ...m, variedad: e.target.value as any }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 outline-none"
              >
                <option value="Naranja Valencia">Naranja Valencia</option>
                <option value="Naranja Navel">Naranja Navel</option>
                <option value="Limón Eureka">Limón Eureka</option>
                <option value="Limón Fino">Limón Fino</option>
                <option value="Mandarina W. Murcott">Mandarina Murcott</option>
                <option value="Mandarina Clementina">Clementina</option>
                <option value="Pomelo Star Ruby">Pomelo Star Ruby</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Etapa</label>
              <select
                value={metadata.etapa}
                onChange={e => setMetadata(m => ({ ...m, etapa: e.target.value as any }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 outline-none"
              >
                <option value="Verde">Verde</option>
                <option value="Envero">Envero</option>
                <option value="Maduro">Maduro</option>
                <option value="Cosecha">Cosecha</option>
              </select>
            </div>
          </div>

          {/* Calibración Agronómica */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Calibración Follaje:</span>
              <span className="font-mono text-amber-400 font-semibold">{metadata.foliageCalibration}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.05"
              value={metadata.foliageCalibration}
              onChange={e => setMetadata(m => ({ ...m, foliageCalibration: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <p className="text-[10px] text-slate-500">
              Factor de fruta oculta en interior de copa (+{Math.round((metadata.foliageCalibration - 1) * 100)}%)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Peso Fruto (g)</label>
              <input
                type="number"
                value={metadata.fruitWeightGram}
                onChange={e => setMetadata(m => ({ ...m, fruitWeightGram: parseInt(e.target.value) || 180 }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Árboles / Ha</label>
              <input
                type="number"
                value={metadata.treeDensityHa}
                onChange={e => setMetadata(m => ({ ...m, treeDensityHa: parseInt(e.target.value) || 416 }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono outline-none"
              />
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 font-medium">Ubicación GPS</span>
              <button
                onClick={handleFetchGps}
                disabled={isGpsLoading}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3 h-3" />
                <span>{isGpsLoading ? 'Obteniendo...' : 'Actualizar GPS'}</span>
              </button>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
              {metadata.gps ? (
                <span>{metadata.gps.latitude.toFixed(5)}, {metadata.gps.longitude.toFixed(5)} (±{metadata.gps.accuracy}m)</span>
              ) : (
                <span className="text-slate-500">Sin coordenadas registradas</span>
              )}
            </div>
          </div>

          {/* Quick Projection Card */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <div className="text-slate-400 font-medium mb-1">Proyección de este Árbol</div>
            <div className="flex items-baseline justify-between">
              <span className="text-slate-300">Carga estimada:</span>
              <span className="text-base font-bold text-amber-400 font-mono tabular-nums">
                {Math.round(boxes.length * metadata.foliageCalibration)} frutos
              </span>
            </div>
            <div className="flex items-baseline justify-between text-slate-400 text-[11px] mt-0.5">
              <span>Peso proyectado:</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {(((boxes.length * metadata.foliageCalibration * metadata.fruitWeightGram) / 1000)).toFixed(1)} kg
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
