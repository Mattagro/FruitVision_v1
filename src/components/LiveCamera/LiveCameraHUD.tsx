import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, Snowflake, Check, Play, AlertCircle, Power } from 'lucide-react';
import { colorDetector } from '../../services/vision/colorDetector';
import { BoundingBox, HsvFilterParams, CaptureMetadata } from '../../types/citrus';

interface LiveCameraHUDProps {
  hsvParams: HsvFilterParams;
  metadata: CaptureMetadata;
  onFreezeFrame: (imageDataUrl: string, boxes: BoundingBox[], width: number, height: number) => void;
  onQuickSave: (imageDataUrl: string, boxes: BoundingBox[], width: number, height: number) => void;
  onLoadDemoImage: () => void;
}

export const LiveCameraHUD: React.FC<LiveCameraHUDProps> = ({
  hsvParams,
  metadata,
  onFreezeFrame,
  onQuickSave,
  onLoadDemoImage,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isManuallyOff, setIsManuallyOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fps, setFps] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [lastDetectedBoxes, setLastDetectedBoxes] = useState<BoundingBox[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashSaved, setFlashSaved] = useState(false);

  // FPS and throttle tracker
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const isBusyRef = useRef<boolean>(false);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Error al acceder a la cámara:', msg);
      setCameraError('No se pudo acceder a la cámara. Puedes utilizar una foto de prueba o cargar una imagen.');
      setIsStreaming(false);
    }
  }, [facingMode]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setIsStreaming(false);
    setFps(0);
    setLiveCount(0);
  }, []);

  // Toggle Camera On/Off (Power)
  const toggleCameraPower = useCallback(() => {
    if (isStreaming) {
      stopCamera();
      setIsManuallyOff(true);
    } else {
      setIsManuallyOff(false);
      startCamera();
    }
  }, [isStreaming, stopCamera, startCamera]);

  useEffect(() => {
    if (!isManuallyOff) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, isManuallyOff]);

  // Continuous Detection HUD Loop
  useEffect(() => {
    if (!isStreaming) return;

    const runDetectionLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === 4 && !isBusyRef.current) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (vw > 0 && vh > 0) {
          if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
          }

          isBusyRef.current = true;
          // Run fast detection
          const result = colorDetector.detect(video, vw, vh, hsvParams, false);
          setLastDetectedBoxes(result.boxes);
          setLiveCount(result.boxes.length);

          // Draw HUD
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, vw, vh);

            // Draw bounding boxes
            for (const b of result.boxes) {
              const bx = b.x * vw;
              const by = b.y * vh;
              const bw = b.width * vw;
              const bh = b.height * vh;

              // Glowing bounding box
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = Math.max(2, Math.round(vw * 0.003));
              ctx.strokeRect(bx, by, bw, bh);

              // Corner accents for high-tech HUD look
              const corner = Math.min(bw, bh) * 0.25;
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = Math.max(3, Math.round(vw * 0.004));

              // Top-left
              ctx.beginPath();
              ctx.moveTo(bx, by + corner);
              ctx.lineTo(bx, by);
              ctx.lineTo(bx + corner, by);
              ctx.stroke();

              // Top-right
              ctx.beginPath();
              ctx.moveTo(bx + bw - corner, by);
              ctx.lineTo(bx + bw, by);
              ctx.lineTo(bx + bw, by + corner);
              ctx.stroke();

              // Label badge
              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.fillRect(bx, Math.max(0, by - 24), 70, 22);
              ctx.fillStyle = '#f59e0b';
              ctx.font = `600 ${Math.max(12, Math.round(vw * 0.016))}px 'JetBrains Mono', monospace`;
              ctx.fillText(`${Math.round(b.confidence * 100)}%`, bx + 6, Math.max(16, by - 7));
            }
          }

          isBusyRef.current = false;

          // Compute FPS
          frameCountRef.current++;
          const now = performance.now();
          if (now - lastTimeRef.current >= 1000) {
            setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
            frameCountRef.current = 0;
            lastTimeRef.current = now;
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(runDetectionLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(runDetectionLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isStreaming, hsvParams]);

  // Capture current high-res frame from video
  const captureCurrentFrame = (): { dataUrl: string; width: number; height: number } | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = video.videoWidth;
    snapCanvas.height = video.videoHeight;
    const ctx = snapCanvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    return {
      dataUrl: snapCanvas.toDataURL('image/jpeg', 0.94),
      width: snapCanvas.width,
      height: snapCanvas.height,
    };
  };

  // Handle Freeze & Annotate
  const handleFreeze = () => {
    const frame = captureCurrentFrame();
    if (!frame) return;
    onFreezeFrame(frame.dataUrl, lastDetectedBoxes, frame.width, frame.height);
  };

  // Handle Quick Save
  const handleQuickSave = () => {
    if (isProcessing) return;
    const frame = captureCurrentFrame();
    if (!frame) return;

    setIsProcessing(true);
    onQuickSave(frame.dataUrl, lastDetectedBoxes, frame.width, frame.height);

    setFlashSaved(true);
    setTimeout(() => setFlashSaved(false), 800);
    setIsProcessing(false);
  };

  // Switch rear/front camera
  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col bg-black overflow-hidden select-none">
      
      {/* Video Stream + HUD Layer */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Real-time HUD Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Flash animation on quick save */}
        {flashSaved && (
          <div className="absolute inset-0 bg-white/40 pointer-events-none transition-opacity duration-300" />
        )}

        {/* Top Info Bar (Transparent Glass HUD) */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3">
            {/* Live Count Stat */}
            <div className="px-3.5 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Cítricos</span>
              <span className="text-xl font-bold font-mono text-white tabular-nums">{liveCount}</span>
            </div>

            {/* FPS Counter */}
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300 tabular-nums">
              {fps} FPS
            </div>
          </div>

          {/* Quick Orchard Label & Power Button */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs text-slate-300">
              <span className="text-amber-400 font-semibold">{metadata.cuartel || 'Cuartel'}</span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span>H:{metadata.hilera || '1'} A:{metadata.arbol || '1'}</span>
            </div>

            {/* Top Power Toggle */}
            <button
              onClick={toggleCameraPower}
              className={`px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isStreaming
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
              }`}
              title={isStreaming ? 'Apagar Cámara (Ahorro de Batería)' : 'Encender Cámara'}
            >
              {isStreaming ? (
                <>
                  <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Apagar</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Encender</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Standby Screen when Camera is Manually Off */}
        {isManuallyOff && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/95 z-20 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-400">
              <CameraOff className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Cámara Apagada</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              El sensor de cámara y los algoritmos de detección están pausados para ahorrar batería del dispositivo en terreno.
            </p>
            <button
              onClick={toggleCameraPower}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Encender Cámara</span>
            </button>
          </div>
        )}

        {/* Fallback Camera Error / Permission Notice */}
        {cameraError && !isManuallyOff && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/90 z-20">
            <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Cámara no disponible</h3>
              <p className="text-sm text-slate-400 mb-6">{cameraError}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={onLoadDemoImage}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cargar Foto de Prueba de Huerto
                </button>
                <button
                  onClick={startCamera}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reintentar Acceso a Cámara</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ergonomic Action Strip (Natural Thumb Zone) */}
      <div className="relative z-10 w-full p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex items-center justify-around gap-3 max-w-lg mx-auto">
        
        {/* Power Button (Turn Camera Off/On) */}
        <button
          onClick={toggleCameraPower}
          className={`w-12 h-12 rounded-full border flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
            isStreaming
              ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-rose-400 hover:border-rose-500/40'
              : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
          }`}
          title={isStreaming ? 'Apagar Cámara (Ahorro de Batería)' : 'Encender Cámara'}
        >
          {isStreaming ? <CameraOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
        </button>

        {/* Switch Camera Button */}
        <button
          onClick={toggleCamera}
          disabled={!isStreaming}
          className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 disabled:opacity-30 flex items-center justify-center text-slate-300 active:scale-95 transition-all cursor-pointer"
          title="Alternar Cámara Trasera / Frontal"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Primary Shutter Action: Freeze & Annotate */}
        <button
          onClick={handleFreeze}
          disabled={!isStreaming}
          className="h-16 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-base flex items-center gap-3 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Snowflake className="w-6 h-6" />
          <span>Congelar & Anotar</span>
        </button>

        {/* Instant Quick Save */}
        <button
          onClick={handleQuickSave}
          disabled={isProcessing || !isStreaming}
          className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
          title="Guardado Rápido Directo"
        >
          <Check className="w-6 h-6" />
        </button>

      </div>
    </div>
  );
};
