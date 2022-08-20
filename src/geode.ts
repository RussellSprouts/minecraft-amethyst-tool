import { loadEmbeddedSchematics } from "./embedded_schematics";
import { activateFileSelects } from "./file_select";
import { getBuddingAmethystPerChunk } from "./geode_afk_worker";
import { MapRenderer } from "./map";
import { p, parseP, Point } from "./point";
import { createNamedWorker } from "./run_in_worker";
import { assertInstanceOf } from "./util";

createNamedWorker('general');
loadEmbeddedSchematics();
activateFileSelects();

/*
const helpButton = assertInstanceOf(document.getElementById('help'), HTMLButtonElement);
const helpResponse = assertInstanceOf(document.getElementById('help-response'), HTMLDivElement);
helpButton.addEventListener('click', () => {
  helpResponse.classList.toggle('hidden');
});
*/

const buddingInRandomTickRange: Record<Point, number> = {};
const buddingInChunk: Record<Point, number> = {};

function parseRegionFileName(name: string): { x: number, z: number } {
  const match = name.match(/.*r\.(-?[0-9]+)\.(-?[0-9]+)\.mca$/);
  if (!match) {
    return { x: Infinity, z: Infinity };
  }
  return {
    x: parseInt(match[1]),
    z: parseInt(match[2])
  };
}

const COLOR_RANGE_MAX = 1000;
function chunkAmountToColor(a: number) {
  const ratio = Math.floor(256 * (1 - a / COLOR_RANGE_MAX));
  const str = ratio < 0
    ? '#000000'
    : ratio < 16 ? `0${ratio.toString(16)}` : ratio.toString(16);
  return `#${str}${str}${str}`;
}

const afkLog = assertInstanceOf(document.getElementById('afk-spot-log'), HTMLElement);
const regionFiles = assertInstanceOf(document.getElementById('region-files'), HTMLInputElement);
regionFiles.addEventListener('change', async () => {
  const step1Response = assertInstanceOf(document.getElementById('step-1-response'), HTMLDivElement);
  const step1ResponseBalloon = assertInstanceOf(document.getElementById('step-1-response-balloon'), HTMLDivElement);
  const step2 = assertInstanceOf(document.getElementById('step-2'), HTMLDivElement);
  step1Response.classList.add('hidden');
  step2.classList.add('hidden');

  afkLog.textContent = '';
  const fileList = Array.from(regionFiles.files ?? []);
  if (fileList.length === 0) {
    return;
  }

  step1ResponseBalloon.textContent = `Selected ${fileList.length} files.`;
  step1Response.classList.remove('hidden');
  step2.classList.remove('hidden');

  const mapLabel = assertInstanceOf(document.getElementById('map-label'), HTMLDivElement);
  const map = new MapRenderer('#map');
  map.addEventListener('mousemove', (x, z) => {
    mapLabel.textContent = `x:${x * 16} z:${z * 16} afk:${buddingInRandomTickRange[p(x, 0, z)] ?? '??'} chunk:${buddingInChunk[p(x, 0, z)] ?? '??'}`;
  });

  fileList.sort((aFile, bFile) => {
    const a = parseRegionFileName(aFile.name);
    const b = parseRegionFileName(bFile.name);
    return (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z);
  });

  function log(...values: unknown[]) {
    console.log(...values);
    const text = values.map(value => value ? (value as object).toString() : '');
    afkLog.textContent = text.join('\t') + '\n';
  }

  let bestChunkX = 0;
  let bestChunkZ = 0;
  let bestAmount = -1;
  function recordChunkAmount(x: number, z: number, amount: number) {
    const chunk = p(x, 0, z);
    buddingInRandomTickRange[chunk] = (buddingInRandomTickRange[chunk] ?? 0) + amount;
    if (map.getTileColor(x, z) !== 'purple') {
      const color = chunkAmountToColor(buddingInRandomTickRange[chunk]);
      map.setTileColor(x, z, color);
    }
    if (buddingInRandomTickRange[chunk] > bestAmount) {
      bestAmount = buddingInRandomTickRange[chunk];
      bestChunkX = x * 16;
      bestChunkZ = z * 16;
      console.log(`New best ${chunk} ${bestAmount}`);
    }
  }

  log(`Processing ${fileList.length} region files...`);

  let fileN = 0;
  for (const file of fileList) {
    log(`Processing ${file.name} (${Math.floor((fileN / fileList.length) * 100)}% overall)\nAFK at x:${bestChunkX} z:${bestChunkZ} to have ${bestAmount} budding amethyst in range.`);
    fileN++;
    try {
      if (file.size === 0) {
        log('  (Skipping empty region)');
        continue;
      }
      if (!file.name.endsWith('.mca')) {
        log('  (Skipping unknown file type)');
      }

      const chunks = await getBuddingAmethystPerChunk(file).promise;
      Object.assign(buddingInChunk, chunks);

      for (const [chunk, buddingInChunk] of Object.entries(chunks)) {
        const [xPos, , zPos] = parseP(chunk as Point);
        if (buddingInChunk > 0) {
          map.setTileColor(xPos, zPos, 'purple');
        } else if (map.getTileColor(xPos, zPos) === map.defaultColor) {
          map.setTileColor(xPos, zPos, 'aliceblue');
        }
        map.requestRender();

        if (buddingInChunk > 0) {
          for (let zOffset = -8; zOffset <= 8; zOffset++) {
            for (let xOffset = -8; xOffset <= 8; xOffset++) {
              // for each chunk around this chunk, check if the afk
              // spot at 0,0 is in random-tick range.
              const dx = xOffset + 0.5;
              const dz = zOffset + 0.5;
              if (dx * dx + dz * dz < 64) {
                // the afk spot puts this chunk in random tick range.
                recordChunkAmount(xPos + xOffset, zPos + zOffset, buddingInChunk);
              }
            }
          }
        }
      }
    } catch (e) {
      log(`Error:`, e);
      console.log(e);
    }
  }

  log(`Processing finished (100% overall).\nAFK at x:${bestChunkX} z:${bestChunkZ} to have ${bestAmount} budding amethyst in range.`);
});
