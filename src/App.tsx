import React, { useState, useEffect, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { LiveCameraHUD } from './components/LiveCamera/LiveCameraHUD';
import { CanvasAnnotator } from './components/Annotator/CanvasAnnotator';
import { HSVAdjuster } from './components/Tuning/HSVAdjuster';
import { YieldView } from './components/YieldEngine/YieldView';
import { LibraryView } from './components/Library/LibraryView';
import { ModelManagerView } from './components/ModelManager/ModelManagerView';

import { CaptureRecord, BoundingBox, CaptureMetadata, HsvFilterParams } from './types/citrus';
import { 
  dbService, 
  DEFAULT_HSV_ORANGE, 
  DEFAULT_ORCHARD_METADATA 
} from './services/db';
import { getInitialDemoCaptures } from './services/demoData';
import { extractExifFromBlob, getCurrentDeviceLocation } from './services/exif';
import { colorDetector } from './services/vision/colorDetector';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('camera');
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Active workspace image & annotations
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentBoxes, setCurrentBoxes] = useState<BoundingBox[]>([]);
  const [currentMetadata, setCurrentMetadata] = useState<CaptureMetadata>({
    ...DEFAULT_ORCHARD_METADATA,
    id: `cap_${Date.now()}`,
    timestamp: Date.now(),
  });

  // HSV Filter parameters
  const [hsvParams, setHsvParams] = useState<HsvFilterParams>(DEFAULT_HSV_ORANGE);

  // Hidden file input for photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from IndexedDB on startup
  useEffect(() => {
    async function init() {
      try {
        const savedCaptures = await dbService.getAllCaptures();
        const savedHsv = await dbService.getSetting<HsvFilterParams>('hsv_params', DEFAULT_HSV_ORANGE);
        setHsvParams(savedHsv);

        if (savedCaptures.length > 0) {
          setCaptures(savedCaptures);
          // Set latest capture as current workspace image
          const latest = savedCaptures[0];
          setCurrentImage(latest.imageDataUrl);
          setCurrentBoxes(latest.boxes);
          setCurrentMetadata(latest.metadata);
        } else {
          // Initialize with demo sample captures for instant testing
          const demoSamples = getInitialDemoCaptures();
          for (const sample of demoSamples) {
            await dbService.saveCapture(sample);
          }
          setCaptures(demoSamples);
          setCurrentImage(demoSamples[0].imageDataUrl);
          setCurrentBoxes(demoSamples[0].boxes);
          setCurrentMetadata(demoSamples[0].metadata);
        }
      } catch (err) {
        console.warn('Error loading from IndexedDB:', err);
      } finally {
        setIsLoadingDb(false);
      }
    }
    init();
  }, []);

  // Handle Photo File Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Extract EXIF GPS and timestamp
    const exif = await extractExifFromBlob(file);
    const loc = (!exif.latitude) ? await getCurrentDeviceLocation() : null;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      // Create new capture metadata
      const newMeta: CaptureMetadata = {
        ...currentMetadata,
        id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: exif.timestamp || Date.now(),
        gps: exif.latitude && exif.longitude
          ? { latitude: exif.latitude, longitude: exif.longitude, accuracy: 5 }
          : loc ? { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy } : undefined,
      };

      // Run quick color detection pass
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const detection = colorDetector.detect(img, img.width, img.height, hsvParams, false);
        setCurrentImage(dataUrl);
        setCurrentBoxes(detection.boxes);
        setCurrentMetadata(newMeta);
        setActiveTab('annotator');
      };
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  // Live Camera: Freeze Frame & Annotate
  const handleFreezeFromCamera = (
    imageDataUrl: string,
    boxes: BoundingBox[],
    _width: number,
    _height: number
  ) => {
    const newMeta: CaptureMetadata = {
      ...currentMetadata,
      id: `cap_${Date.now()}`,
      timestamp: Date.now(),
    };
    setCurrentImage(imageDataUrl);
    setCurrentBoxes(boxes);
    setCurrentMetadata(newMeta);
    setActiveTab('annotator');
  };

  // Live Camera: Quick Save directly to IndexedDB
  const handleQuickSaveFromCamera = async (
    imageDataUrl: string,
    boxes: BoundingBox[],
    width: number,
    height: number
  ) => {
    const newMeta: CaptureMetadata = {
      ...currentMetadata,
      id: `cap_${Date.now()}`,
      timestamp: Date.now(),
    };

    const newRecord: CaptureRecord = {
      id: newMeta.id,
      imageDataUrl,
      width,
      height,
      boxes,
      metadata: newMeta,
      count: boxes.length,
    };

    await dbService.saveCapture(newRecord);
    setCaptures(prev => [newRecord, ...prev]);
  };

  // Save Capture from Canvas Annotator
  const handleSaveFromAnnotator = async (boxes: BoundingBox[], metadata: CaptureMetadata) => {
    if (!currentImage) return;

    const img = new Image();
    img.src = currentImage;
    await new Promise(res => { img.onload = res; });

    const record: CaptureRecord = {
      id: metadata.id,
      imageDataUrl: currentImage,
      width: img.width || 960,
      height: img.height || 720,
      boxes,
      metadata,
      count: boxes.length,
    };

    await dbService.saveCapture(record);
    setCaptures(prev => {
      const idx = prev.findIndex(c => c.id === record.id);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = record;
        return clone;
      }
      return [record, ...prev];
    });

    setCurrentBoxes(boxes);
    setCurrentMetadata(metadata);
    alert('Captura guardada exitosamente en la base de datos local.');
  };

  // Open an existing capture from Library or Yield view
  const handleOpenCapture = (capture: CaptureRecord) => {
    setCurrentImage(capture.imageDataUrl);
    setCurrentBoxes(capture.boxes);
    setCurrentMetadata(capture.metadata);
    setActiveTab('annotator');
  };

  // Delete Capture
  const handleDeleteCapture = async (id: string) => {
    await dbService.deleteCapture(id);
    setCaptures(prev => prev.filter(c => c.id !== id));
  };

  // Clear All
  const handleClearAll = async () => {
    await dbService.clearAllCaptures();
    setCaptures([]);
  };

  // Load Demo Samples
  const handleLoadDemoSamples = async () => {
    const demoSamples = getInitialDemoCaptures();
    for (const sample of demoSamples) {
      await dbService.saveCapture(sample);
    }
    setCaptures(demoSamples);
    setCurrentImage(demoSamples[0].imageDataUrl);
    setCurrentBoxes(demoSamples[0].boxes);
    setCurrentMetadata(demoSamples[0].metadata);
    setActiveTab('library');
  };

  // Save HSV parameters
  const handleSaveHsvDefault = async (params: HsvFilterParams) => {
    await dbService.saveSetting('hsv_params', params);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        captureCount={captures.length}
        onNewPhotoClick={() => fileInputRef.current?.click()}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {activeTab === 'camera' && (
          <LiveCameraHUD
            hsvParams={hsvParams}
            metadata={currentMetadata}
            onFreezeFrame={handleFreezeFromCamera}
            onQuickSave={handleQuickSaveFromCamera}
            onLoadDemoImage={handleLoadDemoSamples}
          />
        )}

        {activeTab === 'annotator' && (
          <CanvasAnnotator
            imageDataUrl={currentImage}
            initialBoxes={currentBoxes}
            metadata={currentMetadata}
            hsvParams={hsvParams}
            onSaveCapture={handleSaveFromAnnotator}
            onOpenLiveCamera={() => setActiveTab('camera')}
          />
        )}

        {activeTab === 'tuner' && (
          <HSVAdjuster
            imageDataUrl={currentImage}
            params={hsvParams}
            onChangeParams={setHsvParams}
            onSaveDefault={handleSaveHsvDefault}
          />
        )}

        {activeTab === 'yield' && (
          <YieldView
            captures={captures}
            onOpenCapture={handleOpenCapture}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            captures={captures}
            onOpenCapture={handleOpenCapture}
            onDeleteCapture={handleDeleteCapture}
            onClearAll={handleClearAll}
            onLoadDemoSamples={handleLoadDemoSamples}
          />
        )}

        {activeTab === 'models' && (
          <ModelManagerView
            onModelLoaded={() => {}}
          />
        )}
      </main>

    </div>
  );
}
