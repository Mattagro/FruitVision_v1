import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Download, Scale, Trees } from 'lucide-react';
import { CaptureRecord, YieldBlockStats } from '../../types/citrus';
import { calculateBlockStats } from '../../services/yieldStats';
import { exportCapturesCsv, triggerDownload } from '../../services/yoloExport';

interface YieldViewProps {
  captures: CaptureRecord[];
  onOpenCapture: (capture: CaptureRecord) => void;
}

export const YieldView: React.FC<YieldViewProps> = ({ captures, onOpenCapture }) => {
  const blockStats = calculateBlockStats(captures);

  // Global simulation override state
  const [globalFoliage, setGlobalFoliage] = useState(1.35);
  const [globalFruitWeight, setGlobalFruitWeight] = useState(180);
  const [globalDensity, setGlobalDensity] = useState(416);

  const handleExportCsv = () => {
    const csv = exportCapturesCsv(captures);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `conteo_citricos_informe_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (captures.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 my-8">
        <BarChart3 className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No hay capturas registradas</h3>
        <p className="text-sm text-slate-400">
          Realiza capturas con la cámara en vivo o anota imágenes para generar estimaciones agronómicas de rendimiento.
        </p>
      </div>
    );
  }

  // Aggregate orchard totals
  const totalTrees = blockStats.reduce((acc, b) => acc + b.uniqueTrees, 0);
  const totalVisibleFruits = blockStats.reduce((acc, b) => acc + b.totalVisibleFruits, 0);
  const overallAvgFruitPerTree = totalTrees > 0 ? totalVisibleFruits / totalTrees : 0;
  
  // Simulated yield
  const totalFruitProjected = overallAvgFruitPerTree * globalFoliage;
  const simulatedKgPerTree = Number(((totalFruitProjected * globalFruitWeight) / 1000).toFixed(2));
  const simulatedTonsPerHa = Number(((simulatedKgPerTree * globalDensity) / 1000).toFixed(2));

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Banner & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white">Estimación Agronómica de Rendimiento</h2>
          <p className="text-xs text-slate-400 mt-1">
            Proyección de cosecha basada en conteo en terreno y fórmula de suficiencia muestral (IC 95%, E ±10%).
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer w-fit"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Exportar Informe CSV</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Árboles Muestreados */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Árboles Muestreados</span>
            <Trees className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
            {totalTrees}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            En {blockStats.length} {blockStats.length === 1 ? 'cuartel' : 'cuarteles'}
          </span>
        </div>

        {/* Carga Media por Árbol */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Fruta Visible Promedio</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tabular-nums">
            {Math.round(overallAvgFruitPerTree)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            {totalVisibleFruits} frutos contados en total
          </span>
        </div>

        {/* Rendimiento por Árbol */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Kilos / Árbol Proyectados</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tabular-nums">
            {simulatedKgPerTree} <span className="text-sm font-sans text-slate-400 font-normal">kg</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Con factor follaje {globalFoliage}x
          </span>
        </div>

        {/* Rendimiento Hectárea */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Rendimiento Estimado</span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
            {simulatedTonsPerHa} <span className="text-sm font-sans text-slate-400 font-normal">t/ha</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            A {globalDensity} árboles/ha
          </span>
        </div>

      </div>

      {/* Simulator Sliders Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Simulador de Parámetros Agronómicos Globales</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          
          {/* Factor Follaje */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Factor Corrección Follaje</span>
              <span className="font-mono text-amber-400 font-semibold">{globalFoliage}x</span>
            </div>
            <input
              type="range"
              min="1.05"
              max="1.80"
              step="0.05"
              value={globalFoliage}
              onChange={e => setGlobalFoliage(parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-[11px] text-slate-500 block">
              Fruta oculta no visible desde el exterior (+{Math.round((globalFoliage - 1) * 100)}%)
            </span>
          </div>

          {/* Peso Medio Fruto */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Peso Medio Fruto Proyectado</span>
              <span className="font-mono text-amber-400 font-semibold">{globalFruitWeight} g</span>
            </div>
            <input
              type="range"
              min="80"
              max="280"
              step="5"
              value={globalFruitWeight}
              onChange={e => setGlobalFruitWeight(parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-[11px] text-slate-500 block">
              Calibre comercial esperado a cosecha
            </span>
          </div>

          {/* Densidad Árboles */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Densidad Plantación</span>
              <span className="font-mono text-amber-400 font-semibold">{globalDensity} árb/ha</span>
            </div>
            <input
              type="range"
              min="250"
              max="800"
              step="10"
              value={globalDensity}
              onChange={e => setGlobalDensity(parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-[11px] text-slate-500 block">
              Marco de plantación del huerto
            </span>
          </div>

        </div>
      </div>

      {/* Detailed Breakdown by Block (Cuartel) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <h3 className="text-sm font-bold text-white">Desglose por Cuartel y Representatividad Estadística</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Predio / Cuartel</th>
                <th className="py-3 px-4">Variedad</th>
                <th className="py-3 px-4 text-right">Árboles</th>
                <th className="py-3 px-4 text-right">Fruta/Árbol</th>
                <th className="py-3 px-4 text-right">CV %</th>
                <th className="py-3 px-4 text-center">Muestra Representativa</th>
                <th className="py-3 px-4 text-right">Kg / Árbol</th>
                <th className="py-3 px-4 text-right">t / ha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {blockStats.map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-white">
                    <div>{b.cuartel}</div>
                    <div className="text-[11px] text-slate-500">{b.predio}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{b.variedad}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200 tabular-nums">{b.uniqueTrees}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-amber-400 tabular-nums">
                    {b.avgFruitsPerTree}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">{b.cvPercent}%</td>
                  <td className="py-3 px-4 text-center">
                    {b.isSampleSufficient ? (
                      <div className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Suficiente ({b.uniqueTrees} &ge; {b.recommendedSampleSize})</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Faltan {b.recommendedSampleSize - b.uniqueTrees} árb (meta: {b.recommendedSampleSize})</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold tabular-nums">
                    {b.estimatedKgPerTree} kg
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white font-bold tabular-nums">
                    {b.estimatedTonsPerHa} t/ha
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
