import { loadEmbeddedSchematics } from "./lib/embedded_schematics";
import { fileName, fileSize, sortFilesByDistance } from "./lib/file_access";
import { activateFileSelects } from "./lib/file_select";
import { getBuddingAmethystPerChunk } from "./lib/geode_afk_worker";
import { MapRenderer } from "./lib/map";
import { p, parseP, Point } from "./lib/point";
import { enableWorkers } from "./lib/run_in_worker";
import { $ } from "./lib/util";

enableWorkers();
loadEmbeddedSchematics();
activateFileSelects();

console.log("Debugging information:");

/**
 * These 88 locations represent the unique combinations
 * of chunks that can be in random-tick range while standing
 * in a chunk. The numbers represent the fraction of the chunk.
 * For now, just use 0,0.
 */
const LOCATIONS_TO_SEARCH = [
  { x: 0, z: 0 },
  /*
  { x: 0.0390625, z: 0.0390625 },
  { x: 0, z: 0.306640625 },
  { x: 0, z: 0.69140625 },
  { x: 0.0390625, z: 0.958984375 },
  { x: 0.0390625, z: 0.333984375 },
  { x: 0.0390625, z: 0.666015625 },
  { x: 0.14453125, z: 0.380859375 },
  { x: 0.14453125, z: 0.619140625 },
  { x: 0.177734375, z: 0.3046875 },
  { x: 0.177734375, z: 0.6953125 },
  { x: 0.169921875, z: 0.2265625 },
  { x: 0.169921875, z: 0.7734375 },
  { x: 0.2109375, z: 0.4296875 },
  { x: 0.2109375, z: 0.5703125 },
  { x: 0.24609375, z: 0.24609375 },
  { x: 0.24609375, z: 0.75390625 },
  { x: 0.2265625, z: 0.169921875 },
  { x: 0.2265625, z: 0.830078125 },
  { x: 0.23828125, z: 0.4765625 },
  { x: 0.23828125, z: 0.521484375 },
  { x: 0.25390625, z: 0.4609375 },
  { x: 0.25390625, z: 0.5390625 },
  { x: 0.3046875, z: 0.177734375 },
  { x: 0.3046875, z: 0.822265625 },
  { x: 0.291015625, z: 0.458984375 },
  { x: 0.291015625, z: 0.541015625 },
  { x: 0.3046875, z: 0.99609375 },
  { x: 0.306640625, z: 0 },
  { x: 0.333984375, z: 0.0390625 },
  { x: 0.333984375, z: 0.9609375 },
  { x: 0.35546875, z: 0.404296875 },
  { x: 0.35546875, z: 0.595703125 },
  { x: 0.380859375, z: 0.14453125 },
  { x: 0.380859375, z: 0.85546875 },
  { x: 0.404296875, z: 0.35546875 },
  { x: 0.404296875, z: 0.64453125 },
  { x: 0.4296875, z: 0.2109375 },
  { x: 0.4296875, z: 0.7890625 },
  { x: 0.458984375, z: 0.291015625 },
  { x: 0.458984375, z: 0.708984375 },
  { x: 0.4609375, z: 0.25390625 },
  { x: 0.4609375, z: 0.74609375 },
  { x: 0.4765625, z: 0.23828125 },
  { x: 0.4765625, z: 0.76171875 },
  { x: 0.521484375, z: 0.23828125 },
  { x: 0.521484375, z: 0.76171875 },
  { x: 0.5703125, z: 0.2109375 },
  { x: 0.5703125, z: 0.7890625 },
  { x: 0.5390625, z: 0.25390625 },
  { x: 0.5390625, z: 0.74609375 },
  { x: 0.541015625, z: 0.291015625 },
  { x: 0.541015625, z: 0.708984375 },
  { x: 0.595703125, z: 0.35546875 },
  { x: 0.595703125, z: 0.64453125 },
  { x: 0.619140625, z: 0.14453125 },
  { x: 0.619140625, z: 0.85546875 },
  { x: 0.64453125, z: 0.404296875 },
  { x: 0.64453125, z: 0.595703125 },
  { x: 0.666015625, z: 0.0390625 },
  { x: 0.666015625, z: 0.9609375 },
  { x: 0.6953125, z: 0.177734375 },
  { x: 0.6953125, z: 0.822265625 },
  { x: 0.69140625, z: 0 },
  { x: 0.693359375, z: 0.998046875 },
  { x: 0.75390625, z: 0.24609375 },
  { x: 0.708984375, z: 0.458984375 },
  { x: 0.708984375, z: 0.541015625 },
  { x: 0.75390625, z: 0.75390625 },
  { x: 0.74609375, z: 0.4609375 },
  { x: 0.74609375, z: 0.5390625 },
  { x: 0.76171875, z: 0.4765625 },
  { x: 0.76171875, z: 0.521484375 },
  { x: 0.7890625, z: 0.4296875 },
  { x: 0.7890625, z: 0.5703125 },
  { x: 0.7734375, z: 0.169921875 },
  { x: 0.7734375, z: 0.830078125 },
  { x: 0.822265625, z: 0.3046875 },
  { x: 0.822265625, z: 0.6953125 },
  { x: 0.830078125, z: 0.2265625 },
  { x: 0.830078125, z: 0.7734375 },
  { x: 0.85546875, z: 0.380859375 },
  { x: 0.85546875, z: 0.619140625 },
  { x: 0.958984375, z: 0.0390625 },
  { x: 0.958984375, z: 0.958984375 },
  { x: 0.9609375, z: 0.333984375 },
  { x: 0.9609375, z: 0.666015625 },
  { x: 0.99609375, z: 0.3046875 },
  { x: 0.99609375, z: 0.6953125 }
  */
];

const COLOR_RANGE_MAX = 1000;
function chunkAmountToColor(a: number) {
  const ratio = Math.floor(256 * (1 - a / COLOR_RANGE_MAX));
  const str = ratio < 0
    ? '#000000'
    : ratio < 16 ? `0${ratio.toString(16)}` : ratio.toString(16);
  return `#${str}${str}${str}`;
}

const afkLog = $('#afk-spot-log');
const regionFiles = $('#region-files', HTMLInputElement);

async function processRegionFiles(fileList: Array<File | string>) {
  const bestBuddingInRandomTickRange: Record<Point, number> = {};
  const buddingInRandomTickRange: Record<Point, Record<Point, number>> = {};
  const buddingInChunk: Record<Point, number> = {};

  const step1Response = $('#step-1-response');
  const step1ResponseBalloon = $('#step-1-response-balloon');
  const step2 = $('#step-2');
  step1Response.classList.add('hidden');
  step2.classList.add('hidden');

  afkLog.textContent = '';
  if (fileList.length === 0) {
    return;
  }

  step1ResponseBalloon.textContent = `Selected ${fileList.length} files.`;
  step1Response.classList.remove('hidden');
  step2.classList.remove('hidden');

  const mapLabel = $('#map-label');
  const map = new MapRenderer('#map');
  map.addEventListener('mousemove', (x, z) => {
    const bestForChunk = buddingInRandomTickRange[p(x, 0, z)] ?? {};
    let best = -1;
    let bestLocation = p(0, 0, 0);
    for (const [location, value] of Object.entries(bestForChunk)) {
      if (value > best) {
        best = value;
        bestLocation = location as Point;
      }
    }
    const [bestX, , bestZ] = parseP(bestLocation);
    mapLabel.textContent = `x:${bestX} z:${bestZ} afk:${best} chunk:${buddingInChunk[p(x, 0, z)] ?? '0'}`;
  });

  sortFilesByDistance(fileList);

  function log(...values: unknown[]) {
    console.log(...values);
    const text = values.map(value => value ? (value as object).toString() : '');
    afkLog.textContent = text.join('\t') + '\n';
  }

  let bestAmount = -1;
  let bestChunkLocation = p(0, 0, 0);
  function recordChunkAmount(x: number, z: number, amount: number, location: Point) {
    const chunk = p(x, 0, z);
    if (!buddingInRandomTickRange[chunk]) {
      buddingInRandomTickRange[chunk] = {};
    }
    buddingInRandomTickRange[chunk][location] = (buddingInRandomTickRange[chunk][location] ?? 0) + amount;

    if (buddingInRandomTickRange[chunk][location] > (bestBuddingInRandomTickRange[chunk] ?? -1)) {
      bestBuddingInRandomTickRange[chunk] = buddingInRandomTickRange[chunk][location];
      if (map.getTileColor(x, z) !== 'purple') {
        const color = chunkAmountToColor(buddingInRandomTickRange[chunk][location]);
        map.setTileColor(x, z, color);
      }
    }
    if (buddingInRandomTickRange[chunk][location] > bestAmount) {
      bestAmount = buddingInRandomTickRange[chunk][location];
      bestChunkLocation = location;
      console.log(`New best ${chunk} ${bestAmount} ${bestChunkLocation}`);
    }
  }

  log(`Processing ${fileList.length} region files...`);

  let fileN = 0;
  for (const file of fileList) {
    const [bestAfkX, , bestAfkZ] = parseP(bestChunkLocation);
    log(`Processing ${fileName(file)} (${Math.floor((fileN / fileList.length) * 100)}% overall)\nAFK at x:${bestAfkX} z:${bestAfkZ} to have ${bestAmount} budding amethyst in range.`);
    fileN++;
    try {
      if (fileSize(file) === 0) {
        log('  (Skipping empty region)');
        continue;
      }
      if (!fileName(file).endsWith('.mca')) {
        log('  (Skipping unknown file type)');
      }

      const chunks = await getBuddingAmethystPerChunk(file).promise;
      Object.assign(buddingInChunk, chunks);

      for (const [chunk, budding] of Object.entries(chunks)) {
        const [xPos, , zPos] = parseP(chunk as Point);
        if (budding > 0) {
          map.setTileColor(xPos, zPos, 'purple');
        } else if (map.getTileColor(xPos, zPos) === map.defaultColor) {
          map.setTileColor(xPos, zPos, 'aliceblue');
        }
        map.requestRender();

        if (budding > 0) {
          for (let zOffset = -8; zOffset <= 8; zOffset++) {
            for (let xOffset = -8; xOffset <= 8; xOffset++) {
              // for each chunk around this chunk, check if each AFK
              // spot in LOCATIONS_TO_SEARCH is in range.
              for (const { x, z } of LOCATIONS_TO_SEARCH) {
                const dx = xOffset + 0.5 + x;
                const dz = zOffset + 0.5 + z;

                if (dx * dx + dz * dz < 64) {
                  // the afk spot puts this chunk in random tick range.
                  recordChunkAmount(xPos + xOffset, zPos + zOffset, budding, p((xPos + xOffset + x) * 16, 0, (zPos + zOffset + z) * 16));
                }
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

  const [x, , z] = parseP(bestChunkLocation);

  map.setTileColor(Math.floor(x / 16), Math.floor(z / 16), 'gold');
  log(`Processing finished (100% overall).\nAFK at x:${x.toFixed(2)} z:${z.toFixed(2)} to have ${bestAmount} budding amethyst in range.`);

}

regionFiles.addEventListener('change', async () => {
  processRegionFiles(Array.from(regionFiles.files ?? []));
});

const sample = $('#sample');
sample.addEventListener('click', () => {
  processRegionFiles([
    '../samples/r.0.0.mca',
    '../samples/r.0.-1.mca',
    '../samples/r.-1.-1.mca',
    '../samples/r.-1.0.mca'
  ]);
});
