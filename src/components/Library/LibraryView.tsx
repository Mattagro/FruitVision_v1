import React, { useState } from 'react';
import { 
  FolderArchive, Download, Trash2, 
  MapPin, Calendar, Trees, Eye, 
  Sparkles, FileText, Check, Upload, Loader2 
} from 'lucide-react';
import { CaptureRecord } from '../../types/citrus';
import { exportYoloDatasetZip, exportCapturesCsv, triggerDownload, importDatasetOrImages } from '../../services/yoloExport';

interface LibraryViewProps {
  captures: CaptureRecord[];
  onOpenCapture: (capture: CaptureRecord) => void;
  onDeleteCapture: (id: string) => void;
  onClearAll: () => void;
  onLoadDemoSamples: () => void;
  onImportCaptures?: (newCaptures: CaptureRecord[]) => Promise<void>;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  captures,
  onOpenCapture,
  onDeleteCapture,
  onClearAll,
  onLoadDemoSamples,
  onImportCaptures,
}) => {
  const [selectedCuartel, setSelectedCuartel] = useState<string>('all');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportFeedback(null);

    try {
      const imported = await importDatasetOrImages(files);
      if (imported.length > 0 && onImportCaptures) {
        await onImportCaptures(imported);
        setImportFeedback(`¡Se importaron ${imported.length} capturas exitosamente!`);
      } else if (imported.length === 0) {
        setImportFeedback('No se encontraron imágenes o anotaciones válidas en los archivos seleccionados.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error al importar: ${msg}`);
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
      setTimeout(() => setImportFeedback(null), 4000);
    }
  };

  // Cuartel list
  const cuarteles = Array.from(new Set(captures.map(c => c.metadata.cuartel).filter(Boolean)));

  const filteredCaptures = selectedCuartel === 'all'
    ? captures
    : captures.filter(c => c.metadata.cuartel === selectedCuartel);

  // Export YOLO dataset ZIP
  const handleExportZip = async () => {
    if (captures.length === 0 || isExportingZip) return;
    setIsExportingZip(true);
    setExportProgress(10);

    try {
      const blob = await exportYoloDatasetZip(captures, (p) => setExportProgress(p));
      triggerDownload(blob, `dataset_citricos_yolo_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (e) {
      alert(`Error al generar ZIP: ${String(e)}`);
    } finally {
      setIsExportingZip(false);
      setExportProgress(0);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (captures.length === 0) return;
    const csv = exportCapturesCsv(captures);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `conteo_citricos_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Bar with Filters and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Biblioteca de Muestreos</span>
            <span className="text-xs text-slate-500 font-mono">({captures.length} capturas)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Imágenes de árboles, etiquetas de frutos y coordenadas GPS almacenadas localmente.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={importInputRef}
            type="file"
            multiple
            accept="image/*,.zip"
            onChange={handleImportFiles}
            className="hidden"
          />

          <button
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-emerald-400" />}
            <span>{isImporting ? 'Importando...' : 'Importar Fotos / Dataset ZIP'}</span>
          </button>

          <button
            onClick={onLoadDemoSamples}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Muestras Demo</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={captures.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportZip}
            disabled={captures.length === 0 || isExportingZip}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingZip ? `Generando ZIP (${exportProgress}%)` : 'Descargar Dataset YOLO (ZIP)'}</span>
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{importFeedback}</span>
        </div>
      )}

      {/* Filter Tabs by Cuartel */}
      {cuarteles.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCuartel('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedCuartel === 'all'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({captures.length})
          </button>
          {cuarteles.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCuartel(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCuartel === c
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {c} ({captures.filter(x => x.metadata.cuartel === c).length})
            </button>
          ))}
        </div>
      )}

      {/* Captures Grid */}
      {filteredCaptures.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
          <FolderArchive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-4">No hay capturas que coincidan con el filtro.</p>
          <button
            onClick={onLoadDemoSamples}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cargar Fotos de Prueba
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCaptures.map(c => {
            const m = c.metadata;
            const dateStr = new Date(m.timestamp).toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={c.id}
                className="group relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-amber-500/50 transition-all flex flex-col shadow-lg"
              >
                {/* Thumbnail Image with Fruit Count Overlay */}
                <div
                  onClick={() => onOpenCapture(c)}
                  className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden cursor-pointer"
                >
                  <img
                    src={c.imageDataUrl}
                    alt={`${m.variedad} ${m.cuartel}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-70" />

                  {/* Count Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs font-mono font-bold text-amber-400 shadow-md">
                    {c.boxes.length} frutos
                  </div>

                  {/* Variety kicker */}
                  <div className="absolute bottom-2 left-3 text-xs font-medium text-white drop-shadow">
                    {m.variedad}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between text-xs space-y-2.5">
                  <div>
                    <div className="font-semibold text-slate-200">
                      {m.cuartel || 'Cuartel General'} · Hilera {m.hilera} · Árbol {m.arbol}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* GPS & Projection */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3 h-3 text-amber-500/70" />
                      <span>{m.gps ? `${m.gps.latitude.toFixed(4)}, ${m.gps.longitude.toFixed(4)}` : 'Sin GPS'}</span>
                    </div>
                    <div className="font-mono text-emerald-400 font-semibold">
                      ~{((c.boxes.length * m.foliageCalibration * m.fruitWeightGram) / 1000).toFixed(1)} kg
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => onOpenCapture(c)}
                      className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 text-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Abrir Anotador</span>
                    </button>

                    <button
                      onClick={() => onDeleteCapture(c.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer"
                      title="Eliminar Captura"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear All Danger Zone */}
      {captures.length > 0 && (
        <div className="pt-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              if (confirm('¿Estás seguro de que deseas eliminar todas las capturas locales?')) {
                onClearAll();
              }
            }}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Borrar Todas las Capturas</span>
          </button>
        </div>
      )}

    </div>
  );
};
