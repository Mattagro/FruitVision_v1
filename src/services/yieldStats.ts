import { CaptureRecord, YieldBlockStats } from '../types/citrus';

/**
 * Calculates agronomic statistics, sampling sufficiency (n for +-10% error at 95% confidence),
 * and yield projections by orchard block (cuartel).
 */
export function calculateBlockStats(captures: CaptureRecord[]): YieldBlockStats[] {
  // Group by predio + cuartel
  const blockMap = new Map<string, CaptureRecord[]>();

  captures.forEach(c => {
    const key = `${c.metadata.predio || 'General'}||${c.metadata.cuartel || 'General'}`;
    if (!blockMap.has(key)) {
      blockMap.set(key, []);
    }
    blockMap.get(key)!.push(c);
  });

  const results: YieldBlockStats[] = [];

  blockMap.forEach((blockCaptures, key) => {
    const [predio, cuartel] = key.split('||');
    const first = blockCaptures[0].metadata;
    const variedad = first.variedad || 'Cítrico';
    const density = first.treeDensityHa || 416;
    const foliageFactor = first.foliageCalibration || 1.35;
    const fruitWeightAvg = first.fruitWeightGram || 180;

    // Group captures by tree ID to calculate tree-level counts
    const treeCounts = new Map<string, number>();
    blockCaptures.forEach(c => {
      const treeKey = `${c.metadata.hilera}-${c.metadata.arbol}`;
      const prev = treeCounts.get(treeKey) || 0;
      treeCounts.set(treeKey, prev + c.boxes.length);
    });

    const counts = Array.from(treeCounts.values());
    const uniqueTrees = counts.length;
    const totalVisibleFruits = counts.reduce((sum, val) => sum + val, 0);

    const avgFruitsPerTree = uniqueTrees > 0 ? totalVisibleFruits / uniqueTrees : 0;

    // Standard deviation and Coefficient of Variation
    let stdDev = 0;
    if (uniqueTrees > 1) {
      const variance = counts.reduce((acc, val) => acc + Math.pow(val - avgFruitsPerTree, 2), 0) / (uniqueTrees - 1);
      stdDev = Math.sqrt(variance);
    }

    const cvPercent = avgFruitsPerTree > 0 ? (stdDev / avgFruitsPerTree) * 100 : 0;

    // Sample size formula: n = ((Z * CV) / E)^2
    // For 95% confidence (Z = 1.96) and Margin of Error E = 10%
    const z = 1.96;
    const e = 10; // 10%
    const recommendedSampleSize = cvPercent > 0 ? Math.ceil(Math.pow((z * cvPercent) / e, 2)) : 10;
    const isSampleSufficient = uniqueTrees >= recommendedSampleSize;

    // Projected kg per tree: (Visible * FoliageCalibration * FruitWeight) / 1000
    const totalProjectedFruit = avgFruitsPerTree * foliageFactor;
    const estimatedKgPerTree = Number(((totalProjectedFruit * fruitWeightAvg) / 1000).toFixed(2));

    // Metric tons per hectare: (kg/tree * density) / 1000
    const estimatedTonsPerHa = Number(((estimatedKgPerTree * density) / 1000).toFixed(2));

    results.push({
      predio,
      cuartel,
      variedad,
      totalCaptures: blockCaptures.length,
      uniqueTrees,
      totalVisibleFruits,
      avgFruitsPerTree: Number(avgFruitsPerTree.toFixed(1)),
      stdDev: Number(stdDev.toFixed(1)),
      cvPercent: Number(cvPercent.toFixed(1)),
      recommendedSampleSize,
      isSampleSufficient,
      estimatedKgPerTree,
      estimatedTonsPerHa,
      density,
      foliageFactor,
      fruitWeightAvg,
    });
  });

  return results;
}
