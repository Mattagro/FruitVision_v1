import { CaptureRecord, BoundingBox } from '../types/citrus';

/**
 * Generate high-resolution realistic synthetic citrus field orchard images
 * for instant testing of detection algorithms and agronomic yield estimation.
 */

export function createSyntheticCitrusImage(
  type: 'orange' | 'lemon',
  width = 960,
  height = 720
): { dataUrl: string; groundTruthBoxes: BoundingBox[] } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Natural Orchard Background (Soil, distant trees, sky gradient)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#537d8d');   // Sky with slight haze
  bgGrad.addColorStop(0.3, '#325838'); // Distant grove
  bgGrad.addColorStop(0.6, '#1e3820'); // Tree trunk depth
  bgGrad.addColorStop(1, '#5a4632');   // Orchard ground / soil
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Trunk and branches
  ctx.strokeStyle = '#3e2d1d';
  ctx.lineWidth = 32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height);
  ctx.quadraticCurveTo(width * 0.48, height * 0.65, width * 0.5, height * 0.45);
  ctx.stroke();

  // Secondary branches
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height * 0.6);
  ctx.lineTo(width * 0.25, height * 0.35);
  ctx.moveTo(width * 0.5, height * 0.55);
  ctx.lineTo(width * 0.75, height * 0.3);
  ctx.stroke();

  // 3. Dense citrus foliage (Layers of dark green and bright sunlit green leaves)
  const leafColors = ['#1a3c1e', '#245229', '#2f6935', '#3d7d44', '#153218', '#4d8a54'];
  const rng = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Draw 850 leaves
  for (let i = 0; i < 850; i++) {
    const r1 = rng(i * 1.3);
    const r2 = rng(i * 2.7);
    const r3 = rng(i * 4.1);

    // Tree canopy ellipse
    const angle = r1 * Math.PI * 2;
    const dist = Math.sqrt(r2);
    const lx = width * 0.5 + Math.cos(angle) * dist * (width * 0.42);
    const ly = height * 0.45 + Math.sin(angle) * dist * (height * 0.38);

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(r3 * Math.PI);

    const leafW = 18 + r2 * 22;
    const leafH = 8 + r1 * 12;

    ctx.fillStyle = leafColors[Math.floor(r3 * leafColors.length)];
    ctx.beginPath();
    ctx.ellipse(0, 0, leafW, leafH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leaf vein highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-leafW, 0);
    ctx.lineTo(leafW, 0);
    ctx.stroke();

    ctx.restore();
  }

  // 4. Realistic Citrus Fruits with Highlights and Leaf Occlusion
  const isOrange = type === 'orange';
  const fruitCount = isOrange ? 24 : 28;
  const groundTruthBoxes: BoundingBox[] = [];

  // Fruit positions centered in canopy
  for (let f = 0; f < fruitCount; f++) {
    const seed = f * 17.82 + 9.3;
    const fx = width * (0.18 + rng(seed) * 0.64);
    const fy = height * (0.18 + rng(seed * 2.3) * 0.55);
    const radius = 22 + Math.floor(rng(seed * 3.1) * 18);

    // Fruit color gradient (Sun highlight to underside shadow)
    const fruitGrad = ctx.createRadialGradient(
      fx - radius * 0.3,
      fy - radius * 0.35,
      radius * 0.15,
      fx,
      fy,
      radius
    );

    if (isOrange) {
      fruitGrad.addColorStop(0, '#ffaa33');   // Sunlit apex
      fruitGrad.addColorStop(0.3, '#f97316'); // Vibrant ripe orange
      fruitGrad.addColorStop(0.85, '#ea580c'); // Deep orange
      fruitGrad.addColorStop(1, '#9a3412');   // Canopy shadow
    } else {
      fruitGrad.addColorStop(0, '#fef08a');   // Lemon sun glint
      fruitGrad.addColorStop(0.35, '#eab308'); // Ripe lemon yellow
      fruitGrad.addColorStop(0.85, '#ca8a04'); // Greenish-yellow flank
      fruitGrad.addColorStop(1, '#713f12');   // Shadow
    }

    ctx.fillStyle = fruitGrad;
    ctx.beginPath();
    if (isOrange) {
      ctx.arc(fx, fy, radius, 0, Math.PI * 2);
    } else {
      // Lemon slight oval
      ctx.ellipse(fx, fy, radius * 1.1, radius * 0.9, rng(seed) * 0.5, 0, Math.PI * 2);
    }
    ctx.fill();

    // Subtle skin pore texture / calyx stem
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(fx, fy - radius * 0.92, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Specular shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(fx - radius * 0.35, fy - radius * 0.35, radius * 0.25, radius * 0.15, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Occasional leaf occluding 15-30% of the fruit
    if (rng(seed * 5.4) > 0.45) {
      ctx.save();
      ctx.translate(fx + radius * 0.4, fy - radius * 0.2);
      ctx.rotate(0.6);
      ctx.fillStyle = '#245229';
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.8, radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Normalized Bounding Box
    const pad = radius * 0.08;
    const boxX = Math.max(0, (fx - radius - pad) / width);
    const boxY = Math.max(0, (fy - radius - pad) / height);
    const boxW = Math.min(1 - boxX, ((radius + pad) * 2) / width);
    const boxH = Math.min(1 - boxY, ((radius + pad) * 2) / height);

    groundTruthBoxes.push({
      id: `gt_${f}_${Date.now()}`,
      x: Number(boxX.toFixed(4)),
      y: Number(boxY.toFixed(4)),
      width: Number(boxW.toFixed(4)),
      height: Number(boxH.toFixed(4)),
      classId: isOrange ? 0 : 1,
      className: isOrange ? 'Naranja Valencia' : 'Limón Eureka',
      confidence: 0.95,
      source: 'manual',
      circularity: 0.88,
      colorHex: isOrange ? '#f97316' : '#eab308',
    });
  }

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    groundTruthBoxes,
  };
}

export function getInitialDemoCaptures(): CaptureRecord[] {
  const orangeData = createSyntheticCitrusImage('orange');
  const lemonData = createSyntheticCitrusImage('lemon');

  const orangeCapture: CaptureRecord = {
    id: 'demo_capture_orange_01',
    imageDataUrl: orangeData.dataUrl,
    width: 960,
    height: 720,
    boxes: orangeData.groundTruthBoxes,
    count: orangeData.groundTruthBoxes.length,
    metadata: {
      id: 'demo_capture_orange_01',
      timestamp: Date.now() - 3600000 * 2,
      predio: 'Fundo El Naranjal',
      cuartel: 'Cuartel 4B',
      hilera: '12',
      arbol: '7',
      cara: 'Total',
      variedad: 'Naranja Valencia',
      etapa: 'Maduro',
      gps: {
        latitude: -34.170832,
        longitude: -70.744415,
        accuracy: 4,
      },
      foliageCalibration: 1.35,
      fruitWeightGram: 185,
      treeDensityHa: 416,
      notes: 'Muestra estándar representativa de cosecha temprana. Iluminación frontal sin sombras.',
    },
  };

  const lemonCapture: CaptureRecord = {
    id: 'demo_capture_lemon_02',
    imageDataUrl: lemonData.dataUrl,
    width: 960,
    height: 720,
    boxes: lemonData.groundTruthBoxes,
    count: lemonData.groundTruthBoxes.length,
    metadata: {
      id: 'demo_capture_lemon_02',
      timestamp: Date.now() - 3600000 * 5,
      predio: 'Fundo El Naranjal',
      cuartel: 'Cuartel 2A',
      hilera: '04',
      arbol: '15',
      cara: 'Total',
      variedad: 'Limón Eureka',
      etapa: 'Maduro',
      gps: {
        latitude: -34.171240,
        longitude: -70.745120,
        accuracy: 5,
      },
      foliageCalibration: 1.40,
      fruitWeightGram: 135,
      treeDensityHa: 500,
      notes: 'Calibre comercial estándar. Copa densa con alta carga.',
    },
  };

  return [orangeCapture, lemonCapture];
}
