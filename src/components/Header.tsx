import React from 'react';
import { Camera, Eye, Sliders, BarChart3, FolderArchive, Cpu } from 'lucide-react';

export type ActiveTab = 'camera' | 'annotator' | 'tuner' | 'yield' | 'library' | 'models';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  captureCount: number;
  onNewPhotoClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  captureCount,
  onNewPhotoClick,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
        
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-lg">
            C
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            CitrusVision
          </span>
        </div>

        {/* Zone 2: Navigation Links (Single-line, concise) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => onTabChange('camera')}
            className={`flex items-center gap-2 transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'camera'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Cámara en Vivo</span>
          </button>

          <button
            onClick={() => onTabChange('annotator')}
            className={`flex items-center gap-2 transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'annotator'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Anotador & Visión</span>
          </button>

          <button
            onClick={() => onTabChange('tuner')}
            className={`flex items-center gap-2 transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'tuner'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Calibrador HSV</span>
          </button>

          <button
            onClick={() => onTabChange('yield')}
            className={`flex items-center gap-2 transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'yield'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Rendimiento</span>
          </button>

          <button
            onClick={() => onTabChange('library')}
            className={`flex items-center gap-2 transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'library'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Biblioteca</span>
            {captureCount > 0 && (
              <span className="text-xs text-slate-500 font-mono">({captureCount})</span>
            )}
          </button>

          <button
            onClick={() => onTabChange('models')}
            className={`flex items-center gap-2 transition-colors whitespace-nowrap py-1 cursor-pointer ${
              activeTab === 'models'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Modelos YOLO</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onNewPhotoClick}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all rounded-lg whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
          >
            Cargar Fotografía
          </button>
        </div>

      </div>

      {/* Mobile Ergonomic Navigation Strip (Horizontal scroller for small screens) */}
      <div className="lg:hidden flex items-center gap-1 px-3 py-2 overflow-x-auto border-t border-slate-900 bg-slate-950/95 scrollbar-none">
        <button
          onClick={() => onTabChange('camera')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeTab === 'camera' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Cámara</span>
        </button>
        <button
          onClick={() => onTabChange('annotator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeTab === 'annotator' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Anotador</span>
        </button>
        <button
          onClick={() => onTabChange('tuner')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeTab === 'tuner' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Calibrador</span>
        </button>
        <button
          onClick={() => onTabChange('yield')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeTab === 'yield' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Rendimiento</span>
        </button>
        <button
          onClick={() => onTabChange('library')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeTab === 'library' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Biblioteca ({captureCount})</span>
        </button>
        <button
          onClick={() => onTabChange('models')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeTab === 'models' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>YOLO</span>
        </button>
      </div>
    </header>
  );
};
