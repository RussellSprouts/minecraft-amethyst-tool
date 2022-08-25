import { getPatternData } from "./lib/afk_worker";
import { MapRenderer } from "./lib/map";
import { createNamedWorker } from "./lib/run_in_worker";
import { $, assertInstanceOf } from "./lib/util";

async function main() {
  createNamedWorker('general');

  const INCREMENTS = 512;

  const chunkPatternCanvas = $('#chunkPattern', HTMLCanvasElement);
  chunkPatternCanvas.width = INCREMENTS;
  chunkPatternCanvas.height = INCREMENTS;
  const chunkPatternLog = $('#patternLog');
  const context = assertInstanceOf(chunkPatternCanvas.getContext('2d'), CanvasRenderingContext2D);
  const chunkPatternMap = new MapRenderer('#chunkPatternMap');
  chunkPatternMap.requestRender();

  const GRID_COLORS = ['#fff', '#ddd'];
  for (let z = 0; z < 16; z++) {
    for (let x = 0; x < 16; x++) {
      context.fillStyle = GRID_COLORS[(x & 1) ^ (z & 1)];
      const size = INCREMENTS / 16;
      context.fillRect(x * size, z * size, size, size);
    }
  }

  const patterns = await getPatternData(INCREMENTS).promise;

  for (const pattern1 of patterns.keys()) {
    for (const pattern2 of patterns.keys()) {
      if (pattern1 === pattern2) { continue; }
      if ((pattern1 & pattern2) === pattern1) {
        // pattern2 contains all of the bits of pattern1
        patterns.get(pattern1)!.length = 0;
      }
    }
  }

  let commonBits: bigint = patterns.keys().next().value;
  let neverSeenBits: bigint = patterns.keys().next().value;
  for (const pattern of patterns.keys()) {
    commonBits &= pattern;
    neverSeenBits |= pattern;

    if (patterns.get(pattern)!.length === 0) {
      patterns.delete(pattern);
    }
  }

  console.log('common', commonBits.toString(16), 'neverSeen', neverSeenBits.toString(16));

  function popcount(bigint: bigint): number {
    let result = 0;
    while (bigint !== 0n) {
      result += Number(bigint & 1n);
      bigint >>= 1n;
    }
    return result;
  }

  const bestPoints = [];
  const colors: Map<bigint, string> = new Map();
  for (const [pattern, points] of patterns.entries()) {
    const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    colors.set(pattern, color);
    context.fillStyle = color;

    let xTotal = 0;
    let zTotal = 0;

    for (const { x, z } of points) {
      context.fillRect(x, z, 1, 1);
      xTotal += x;
      zTotal += z;
    }

    const midX = xTotal / points.length;
    const midZ = zTotal / points.length;

    let best = 1e9;
    let bestX = 0;
    let bestZ = 0;
    for (const { x, z } of points) {
      const dx = midX - x;
      const dz = midZ - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < best) {
        best = d2;
        bestX = x;
        bestZ = z;
      }
    }

    bestPoints.push({ x: bestX / INCREMENTS, z: bestZ / INCREMENTS });
    console.log('Best point for', pattern, bestX / INCREMENTS, bestZ / INCREMENTS, popcount(pattern), 'in range');
  }
  console.log('best points', bestPoints);

  console.log(patterns);
  const patternKeys = Array.from(patterns.keys());
  patternKeys.sort((a, b) => {
    let aLeastX = INCREMENTS;
    let aLeastZ = INCREMENTS;

    for (const { x, z } of patterns.get(a)!) {
      if (x < aLeastX) { aLeastX = x; }
      if (z < aLeastZ) { aLeastZ = z; }
    }
    let bLeastX = INCREMENTS;
    let bLeastZ = INCREMENTS;
    for (const { x, z } of patterns.get(b)!) {
      if (x < bLeastX) { bLeastX = x; }
      if (z < bLeastZ) { bLeastZ = z; }
    }

    if (aLeastZ === bLeastZ) {
      return aLeastX - bLeastX;
    }
    return aLeastZ - bLeastZ;
  });
  for (const pattern of patternKeys) {
    const elt = document.createElement('span');
    const color = colors.get(pattern)!;
    elt.textContent = `${popcount(pattern)}\n`;
    elt.style.color = color;
    elt.addEventListener('mouseenter', () => {
      context.fillStyle = 'red';
      let sampleX: number | undefined = undefined, sampleZ = 0;
      for (const { x, z } of patterns.get(pattern)!) {
        if (sampleX === undefined) { sampleX = x; sampleZ = z; }
        context.fillRect(x, z, 1, 1);
      }
      showPatternOnMap(sampleX!, sampleZ);
    });
    elt.addEventListener('mouseleave', () => {
      context.fillStyle = color;
      for (const { x, z } of patterns.get(pattern)!) {
        context.fillRect(x, z, 1, 1);
      }
    });
    chunkPatternLog.appendChild(elt);
  }

  const hoverInfo = $('#hoverInfo');
  chunkPatternCanvas.addEventListener('mousemove', (e) => {
    const canvasBounds = chunkPatternCanvas.getBoundingClientRect();
    const x = (e.clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left) * INCREMENTS;
    const z = (e.clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top) * INCREMENTS;
    showPatternOnMap(x, z);
  }, { passive: true });

  function showPatternOnMap(x: number, z: number) {
    let common: bigint = commonBits;
    let never = neverSeenBits;
    for (let zOffset = -8; zOffset <= 8; zOffset++) {
      for (let xOffset = -8; xOffset <= 8; xOffset++) {
        const currentX = x / INCREMENTS;
        const currentZ = z / INCREMENTS;
        const targetX = xOffset + 0.5;
        const targetZ = zOffset + 0.5;
        const dx = currentX - targetX;
        const dy = currentZ - targetZ;
        const inRange = dx * dx + dy * dy < 64;
        chunkPatternMap.setTileColor(xOffset, zOffset,
          (common & 1n) ? '#abd9e9' : !(never & 1n) ? '#999' : inRange ? '#2c7bb6' : '#ddd');
        common >>= 1n;
        never >>= 1n;
      }
    }
    chunkPatternMap.setTileColor(0, 0, 'yellow');
    chunkPatternMap.requestRender();

    hoverInfo.textContent = `x:${(x / INCREMENTS * 16).toFixed(2)} z:${(z / INCREMENTS * 16).toFixed(2)}`;
  }

  const loading = $('#loading');
  loading.style.display = 'none';
}
main();