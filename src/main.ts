import { SchematicReader, IntRange } from "./litematic";
import { Point, p, parseP } from './point';
import { readFile, saveFile } from './file_access';
import { Renderer } from "./renderer";
import { expected_shards_per_hour_per_face } from './optimization';
import { AnvilParser } from './anvil';
import * as pako from "pako";
import { Nbt } from "./nbt";

const fileSelector = document.getElementById('litematic') as HTMLInputElement;
fileSelector.addEventListener('change', async () => {
  const fileList = fileSelector.files;
  if (!fileList || fileList.length > 1) {
    throw new Error('One file at a time');
  } else if (fileList.length === 0) {
    return; // do nothing
  }

  console.log(fileList);

  const fileContents = await readFile(fileList[0]);
  const schematic = new SchematicReader(fileContents);
  main(schematic);
});

const regionSelector = document.getElementById('region') as HTMLInputElement;
regionSelector.addEventListener('change', async () => {
  const fileList = regionSelector.files;
  if (!fileList || fileList.length > 1) {
    throw new Error('One file at a time');
  } else if (fileList.length === 0) {
    console.log('No files, doing nothing.');
    return; // do nothing
  }

  const renderer = new Renderer('#c');
  const blockReadout = document.getElementById('block-readout')!;
  renderer.addEventListener('hover', (e) => {
    blockReadout.textContent = (e as CustomEvent).detail.blockState;
  });

  console.log(fileList);

  const fileContents = await readFile(fileList[0]);
  const parser = new AnvilParser(new DataView(fileContents.buffer));

  const allBlocks = new Set<string>();
  const blockCounts = new Map<string, number>();

  for (let x = 0; x < 32; x++) {
    for (let z = 0; z < 32; z++) {
      console.log("processing", x, z);
      parser.parseChunk(x, z, allBlocks, renderer, blockCounts);
    }
  }
  console.log('done.', allBlocks, blockCounts);
  if (allBlocks.has('minecraft:budding_amethyst')) {
    console.log('Has budding amethyst!');
  }
});

const previewSelector = document.getElementById('preview') as HTMLInputElement;
previewSelector.addEventListener('change', async () => {
  const fileList = previewSelector.files;
  if (!fileList || fileList.length > 1) {
    throw new Error('One file at a time');
  } else if (fileList.length === 0) {
    console.log('File unselected');
    return; // do nothing
  }

  console.log(fileList);

  const fileContents = await readFile(fileList[0]);
  const schematic = new SchematicReader(fileContents);
  const renderer = new Renderer('#c');

  const blockReadout = document.getElementById('block-readout')!;
  renderer.addEventListener('hover', (e) => {
    blockReadout.textContent = (e as CustomEvent).detail.blockState;
  });

  console.log(schematic, renderer);
  for (let y = 0; y < schematic.height; y++) {
    for (let z = 0; z < schematic.length; z++) {
      for (let x = 0; x < schematic.width; x++) {
        const block = schematic.getBlock(x, y, z);
        renderer.setBlockState(x, y, z, block);
      }
    }
  }
});

const sampleButton = document.getElementById('sample') as HTMLButtonElement;
sampleButton.addEventListener('click', () => {
  const fileContents = new Uint8Array([
    31, 139, 8, 0, 0, 0, 0, 0, 0, 255, 141, 84, 193, 78, 220, 48,
    16, 125, 238, 134, 146, 205, 178, 37, 149, 232, 133, 79, 64, 226, 194, 177,
    167, 0, 75, 37, 14, 139, 86, 101, 197, 181, 50, 27, 179, 24, 188, 49,
    138, 29, 169, 32, 245, 135, 122, 234, 183, 33, 238, 219, 73, 28, 39, 33,
    93, 84, 70, 145, 60, 243, 242, 198, 111, 98, 229, 57, 2, 6, 216, 155,
    202, 76, 44, 114, 126, 99, 39, 220, 242, 43, 145, 27, 169, 51, 32, 250,
    61, 192, 118, 83, 97, 43, 66, 56, 21, 150, 167, 196, 9, 48, 154, 203,
    149, 56, 205, 5, 183, 34, 5, 216, 175, 243, 249, 159, 131, 0, 59, 37,
    58, 213, 169, 188, 145, 45, 28, 97, 124, 150, 45, 148, 54, 50, 91, 94,
    202, 39, 49, 0, 251, 73, 251, 125, 162, 245, 177, 94, 159, 104, 29, 35,
    196, 104, 34, 204, 34, 151, 15, 182, 146, 28, 96, 244, 93, 44, 41, 61,
    213, 69, 102, 137, 194, 8, 153, 107, 203, 213, 137, 210, 139, 123, 67, 200,
    69, 136, 143, 199, 133, 189, 213, 57, 118, 243, 194, 24, 161, 148, 121, 200,
    117, 97, 205, 145, 231, 94, 105, 85, 172, 4, 48, 124, 9, 17, 92, 112,
    74, 163, 187, 194, 216, 195, 165, 208, 41, 229, 216, 118, 26, 38, 234, 226,
    59, 24, 85, 26, 151, 150, 62, 176, 20, 154, 1, 1, 234, 112, 73, 76,
    79, 130, 119, 4, 145, 152, 207, 99, 215, 28, 116, 223, 199, 110, 97, 21,
    218, 48, 19, 230, 155, 75, 130, 19, 122, 83, 143, 53, 187, 184, 189, 227,
    78, 221, 17, 218, 128, 117, 37, 223, 138, 146, 144, 196, 126, 26, 52, 213,
    255, 226, 93, 164, 42, 154, 243, 248, 103, 150, 254, 30, 213, 4, 147, 234,
    40, 106, 46, 107, 178, 238, 169, 50, 87, 38, 27, 196, 88, 205, 141, 189,
    220, 94, 178, 73, 185, 31, 73, 47, 97, 241, 171, 225, 186, 253, 140, 161,
    247, 77, 174, 231, 203, 6, 153, 196, 97, 65, 31, 239, 199, 16, 159, 103,
    34, 75, 201, 67, 213, 143, 57, 151, 206, 0, 100, 83, 132, 51, 242, 86,
    105, 153, 218, 89, 168, 157, 53, 174, 157, 85, 53, 183, 191, 243, 140, 43,
    97, 173, 136, 8, 255, 224, 45, 49, 94, 249, 43, 224, 43, 151, 57, 60,
    188, 223, 194, 215, 69, 90, 138, 255, 32, 216, 222, 62, 26, 75, 186, 65,
    223, 205, 235, 245, 250, 185, 113, 115, 59, 240, 55, 85, 200, 180, 29, 120,
    88, 94, 19, 74, 156, 101, 150, 134, 22, 30, 11, 95, 213, 20, 127, 1,
    31, 118, 161, 121, 155, 4, 0, 0,
  ]);
  const schematic = new SchematicReader(fileContents);
  main(schematic);
});

const afkSpot = document.getElementById('afk') as HTMLInputElement;
const afkLog = document.getElementById('afk-spot-log') as HTMLElement;
afkSpot.addEventListener('change', async () => {
  afkLog.textContent = '';
  const fileList = Array.from(afkSpot.files ?? []);
  function log(...values: unknown[]) {
    console.log(...values);
    const text = values.map(value => value ? (value as {}).toString() : '');
    afkLog.textContent += text.join('\t') + '\n';
  }

  log(`Processing ${fileList.length} region files...`);

  // How many budding amethysts we activate from the
  // center, but just towards the NW (-x, -z) side of the chunk.
  const chunkAmountsNW: Record<Point, number> = {};
  const chunkAmountsSW: Record<Point, number> = {};
  const chunkAmountsNE: Record<Point, number> = {};
  const chunkAmountsSE: Record<Point, number> = {};
  const chunkAmountsCorner: Record<Point, number> = {};

  let bestChunk = p(0, 0, 0);
  let bestAmount = -1;
  let bestCoords = '';
  function recordChunkAmount(chunkAmount: Record<Point, number>, chunk: Point, amount: number, coords: string) {
    chunkAmount[chunk] = (chunkAmount[chunk] ?? 0) + amount;
    if (chunkAmount[chunk] > bestAmount) {
      bestAmount = chunkAmount[chunk];
      bestChunk = chunk;
      bestCoords = coords;
    }
  }

  let fileN = 0;
  for (const file of fileList) {
    log(`Processing ${file.name} (${Math.floor((fileN / fileList.length) * 100)}% overall)`);
    fileN++;
    try {
      if (file.size === 0) {
        log('  (Skipping empty region)');
        continue;
      }
      if (!file.name.endsWith('.mca')) {
        log('  (Skipping unknown file type)');
      }

      const fileContents = await readFile(file);
      const parser = new AnvilParser(new DataView(fileContents.buffer));
      const chunksWithGeodes = parser.countBlocks('minecraft:budding_amethyst');
      let total = 0;
      const chunks = Object.keys(chunksWithGeodes) as Point[];
      for (const chunk of chunks) {
        total += chunksWithGeodes[chunk];
      }
      log(`  found ${total} budding amethyst blocks across ${chunks.length} chunks`);
      for (const chunk of Object.keys(chunksWithGeodes) as Point[]) {
        const [chunkX, , chunkZ] = parseP(chunk);

        const chunkCenterX = chunkX + 0.5;
        const chunkCenterZ = chunkZ + 0.5;
        for (let xOffset = -8; xOffset <= 8; xOffset++) {
          for (let zOffset = -8; zOffset <= 8; zOffset++) {
            const chunkP = p(chunkX + xOffset, 0, chunkZ + zOffset);

            let dx = xOffset;
            let dz = zOffset;
            if (dx * dx + dz * dz < 8 * 8) {
              recordChunkAmount(chunkAmountsCorner, chunkP, chunksWithGeodes[chunk], '0:0:0');
            }

            dx = chunkCenterX - (chunkX + xOffset + 0.5 - 0.5 / 16);
            dz = chunkCenterZ - (chunkZ + zOffset + 0.5 - 0.5 / 16);
            if (dx * dx + dz * dz < 8 * 8) {
              recordChunkAmount(chunkAmountsNW, chunkP, chunksWithGeodes[chunk], '7:0:7');
            }

            dx = chunkCenterX - (chunkX + xOffset + 0.5 - 0.5 / 16);
            dz = chunkCenterZ - (chunkZ + zOffset + 0.5 + 0.5 / 16);
            if (dx * dx + dz * dz < 8 * 8) {
              recordChunkAmount(chunkAmountsSW, chunkP, chunksWithGeodes[chunk], '7:0:8');
            }

            dx = chunkCenterX - (chunkX + xOffset + 0.5 + 0.5 / 16);
            dz = chunkCenterZ - (chunkZ + zOffset + 0.5 + 0.5 / 16);
            if (dx * dx + dz * dz < 8 * 8) {
              recordChunkAmount(chunkAmountsSE, chunkP, chunksWithGeodes[chunk], '8:0:8');
            }

            dx = chunkCenterX - (chunkX + xOffset + 0.5 + 0.5 / 16);
            dz = chunkCenterZ - (chunkZ + zOffset + 0.5 - 0.5 / 16);
            if (dx * dx + dz * dz < 8 * 8) {
              recordChunkAmount(chunkAmountsNE, chunkP, chunksWithGeodes[chunk], '8:0:7');
            }
          }
        }
      }
      log(`Best so far: ${bestAmount} budding amethyst blocks, from ${bestCoords} in chunk ${bestChunk}`);
    } catch (e) {
      log(`Error:`, e);
      console.log(e);
    }
  }

  log(`Best overall: ${bestAmount} budding amethyst blocks, from ${bestCoords} in chunk ${bestChunk}`);
  const [chunkX, , chunkZ] = parseP(bestChunk);
  const [offsetX, , offsetZ] = parseP(bestCoords as Point);
  log(`AFK at the coordinates X:${chunkX * 16 + offsetX}, Z: ${chunkZ * 16 + offsetZ} to have ${bestAmount} blocks in range.`);
  console.log(chunkAmountsNW);
});

const nbtPreview = document.getElementById('nbt') as HTMLInputElement;
nbtPreview.addEventListener('change', async () => {
  const fileList = nbtPreview.files ?? [];
  const contents = await readFile(fileList[0]);
  let uncompressed = contents;
  try {
    uncompressed = pako.ungzip(contents);
  } catch (e) {
  }

  console.log(new Nbt('*').parse(uncompressed));
});

function main(schematic: SchematicReader) {
  const renderer = new Renderer('#c');

  const blockReadout = document.getElementById('block-readout')!;
  renderer.addEventListener('hover', (e) => {
    blockReadout.textContent = (e as CustomEvent).detail.blockState;
  });

  const x_coords: Record<Point, boolean> = {};
  const y_coords: Record<Point, boolean> = {};
  const z_coords: Record<Point, boolean> = {};

  let min_bud_x = 1e100;
  let max_bud_x = -1e100;
  let min_bud_y = 1e100;
  let max_bud_y = -1e100;
  let min_bud_z = 1e100;
  let max_bud_z = -1e100;

  for (let y = 0; y < schematic.height; y++) {
    for (let z = 0; z < schematic.length; z++) {
      for (let x = 0; x < schematic.width; x++) {
        const block = schematic.getBlock(x, y, z);
        if (block === 'minecraft:budding_amethyst') {
          renderer.setBlockState(x, y, z, block);

          min_bud_x = Math.min(x, min_bud_x);
          max_bud_x = Math.max(x, max_bud_x);
          min_bud_y = Math.min(y, min_bud_y);
          max_bud_y = Math.max(y, max_bud_y);
          min_bud_z = Math.min(z, min_bud_z);
          max_bud_z = Math.max(z, max_bud_z);
        }
        // else if (block === 'minecraft:calcite') {
        //   renderer.setBlockState(x, y, z, block);
        // } else if (block === 'minecraft:smooth_basalt') {
        //   renderer.setBlockState(x, y, z, block);
        // } else if (block === 'minecraft:amethyst_block') {
        //   renderer.setBlockState(x, y, z, block);
        // }
      }
    }
  }

  const fx = max_bud_x + 3;
  const fy = max_bud_y + 3;
  const fz = max_bud_z + 3;

  // Project all budding amethyst blocks onto the planes
  for (let y = 0; y < schematic.height; y++) {
    for (let z = 0; z < schematic.length; z++) {
      for (let x = 0; x < schematic.width; x++) {
        const block = schematic.getBlock(x, y, z);
        if (block === 'minecraft:budding_amethyst') {
          x_coords[p(fx, y, z)] = true;
          y_coords[p(x, fy, z)] = true;
          z_coords[p(x, y, fz)] = true;
        }
      }
    }
  }

  renderer.camera.position.set(-5, max_bud_y + 5, -5);
  const center_x = (min_bud_x + max_bud_x) / 2;
  const center_y = (min_bud_y + max_bud_y) / 2;
  const center_z = (min_bud_z + max_bud_z) / 2;
  renderer.controls.target.set(center_x, center_y, center_z);
  console.log('EXTENTS:', 'x:', min_bud_x, max_bud_x, 'y:', min_bud_y, max_bud_y, 'z:', min_bud_z, max_bud_z);

  console.log(x_coords, y_coords, z_coords);
  const x_slime: Record<Point, boolean> = {};
  const y_slime: Record<Point, boolean> = {};
  const z_slime: Record<Point, boolean> = {};

  // Display the projected planes, and find the blocks which should be part of
  // the sweepers
  for (const x of new IntRange(min_bud_x, max_bud_x + 1).expand(1)) {
    for (const z of new IntRange(min_bud_z, max_bud_z + 1).expand(1)) {
      if (
        !y_coords[p(x, fy, z)] &&
        (y_coords[p(x - 1, fy, z)] || y_coords[p(x + 1, fy, z)] ||
          y_coords[p(x, fy, z - 1)] || y_coords[p(x, fy, z + 1)])) {
        y_slime[p(x, fy, z)] = true;
      }
    }
  }

  for (const y of new IntRange(min_bud_y, max_bud_y + 1).expand(1)) {
    for (const z of new IntRange(min_bud_z, max_bud_z + 1).expand(1)) {
      if (
        !x_coords[p(fx, y, z)] &&
        (x_coords[p(fx, y - 1, z)] || x_coords[p(fx, y + 1, z)] ||
          x_coords[p(fx, y, z - 1)] || x_coords[p(fx, y, z + 1)])) {
        x_slime[p(fx, y, z)] = true;
      }
    }
  }

  for (const x of new IntRange(min_bud_x, max_bud_x + 1).expand(1)) {
    for (const y of new IntRange(min_bud_y, max_bud_y + 1).expand(1)) {
      if (
        !z_coords[p(x, y, fz)] &&
        (z_coords[p(x - 1, y, fz)] || z_coords[p(x + 1, y, fz)] ||
          z_coords[p(x, y - 1, fz)] || z_coords[p(x, y + 1, fz)])) {
        z_slime[p(x, y, fz)] = true;
      }
    }
  }

  // Flood-fills from the given [a,b] block, checking
  // if at least nExpand blocks can go into a sweeper.
  function canExpandTo(
    nExpand: number,
    coords: Record<Point, boolean>,
    p: (a: number, b: number) => Point,
    parseP: (point: Point) => [number, number],
    a: number,
    b: number
  ) {
    const processed: Record<Point, boolean> = {};
    const toProcess = [
      p(a, b)
    ];
    let nFilled = 0;

    while (toProcess.length && nFilled < nExpand) {
      const point = toProcess.shift()!;
      if (processed[point]) {
        continue;
      }
      if (!coords[point]) {
        const [aa, bb] = parseP(point);
        nFilled += 1;
        toProcess.push(
          p(aa + 1, bb),
          p(aa - 1, bb),
          p(aa, bb + 1),
          p(aa, bb - 1)
        );
      }
      processed[point] = true;
    }

    return nFilled >= nExpand;
  }

  for (const point of Object.keys(x_slime) as Array<Point>) {
    if (x_slime[point]) {
      const [, y, z] = parseP(point);
      if (!canExpandTo(
        4,
        x_coords,
        (y, z) => p(fx, y, z),
        (point) => { const [, y, z] = parseP(point); return [y, z]; },
        y, z
      )) {
        x_slime[point] = false;
        x_coords[point] = true;
      }
    }
  }

  for (const point of Object.keys(y_slime) as Array<Point>) {
    if (y_slime[point]) {
      const [x, , z] = parseP(point);
      if (!canExpandTo(
        5,
        y_coords,
        (x, z) => p(x, fy, z),
        (point) => { const [x, , z] = parseP(point); return [x, z]; },
        x, z
      )) {
        y_slime[point] = false;
        y_coords[point] = true;
      }
    }
  }

  for (const point of Object.keys(z_slime) as Array<Point>) {
    if (z_slime[point]) {
      const [x, y] = parseP(point);
      if (!canExpandTo(
        4,
        z_coords,
        (x, y) => p(x, y, fz),
        (point) => { const [x, y] = parseP(point); return [x, y]; },
        x, y
      )) {
        z_slime[point] = false;
        z_coords[point] = true;
      }
    }
  }

  const faces = [
    [+1, 0, 0],
    [-1, 0, 0],
    [0, +1, 0],
    [0, -1, 0],
    [0, 0, +1],
    [0, 0, -1],
  ] as const;

  const all_faces: Record<Point, boolean> = {};
  const accessible_faces: Record<Point, boolean> = {};
  const unreachable_faces: Record<Point, boolean> = {};
  // find out how many faces there are, and which are are accessible.
  for (let y = 0; y < schematic.height; y++) {
    for (let z = 0; z < schematic.length; z++) {
      for (let x = 0; x < schematic.width; x++) {
        if (schematic.getBlock(x, y, z) === 'minecraft:budding_amethyst') {
          for (const [dx, dy, dz] of faces) {
            const xx = x + dx;
            const yy = y + dy;
            const zz = z + dz;
            if (schematic.getBlock(xx, yy, zz) !== 'minecraft:budding_amethyst') {
              const key = p(xx, yy, zz);
              all_faces[key] = true;

              if (x_slime[p(fx, yy, zz)] || y_slime[p(xx, fy, zz)] ||
                z_slime[p(xx, yy, fz)]) {
                accessible_faces[key] = true;
              } else {
                unreachable_faces[key] = true;
              }
            }
          }
        }
      }
    }
  }

  const n_all_faces = Object.keys(all_faces).length;
  const n_accessible_faces = Object.keys(accessible_faces).length;
  const n_unreachable_faces = Object.keys(unreachable_faces).length;
  console.log('TOTAL FACES EXPOSED: ', n_all_faces);
  console.log('ACCESSIBLE FACES: ', n_accessible_faces);
  console.log('UNREACHABLE FACES: ', n_unreachable_faces);
  console.log(
    'THEORETICAL MAX EFFICIENCY: ',
    percent(n_accessible_faces / n_all_faces));
  console.log('EXPECTED SHARDS PER HOUR', expected_shards_per_hour_per_face * n_accessible_faces);

  function percent(p: number) {
    return `${Math.round((p * 100) * 100) / 100}% `;
  }

  // Which side the button should attach to,
  // based on which direction there is a block.
  // const button_by_face = [
  //   'minecraft:stone_button[face=wall,facing=west]',     // [+1, 0, 0]
  //   'minecraft:stone_button[face=wall,facing=east]',     // [-1, 0, 0]
  //   'minecraft:stone_button[face=ceiling,facing=north]', // [0, +1, 0]
  //   'minecraft:stone_button[face=floor,facing=north]',   // [0, -1, 0]
  //   'minecraft:stone_button[face=wall,facing=north]',    // [0, 0, +1]
  //   'minecraft:stone_button[face=wall,facing=south]',    // [0, 0, -1]
  // ] as const;

  const button_by_face = [
    'minecraft:amethyst_cluster[facing=west,waterlogged=false]', // [+1, 0, 0]
    'minecraft:amethyst_cluster[facing=east,waterlogged=false]', // [-1, 0, 0]
    'minecraft:amethyst_cluster[facing=down,waterlogged=false]', // [0, +1, 0]
    'minecraft:amethyst_cluster[facing=up,waterlogged=false]',   // [0, -1, 0]
    'minecraft:amethyst_cluster[facing=north,waterlogged=false]',// [0, 0, +1]
    'minecraft:amethyst_cluster[facing=south,waterlogged=false]',// [0, 0, -1]
  ] as const;

  for (const unreachable_block of Object.keys(unreachable_faces) as Array<Point>) {
    const [x, y, z] = parseP(unreachable_block);
    for (let i = 0; i < faces.length; i++) {
      const [dx, dy, dz] = faces[i];
      if (schematic.getBlock(x + dx, y + dy, z + dz) === 'minecraft:budding_amethyst') {
        renderer.setBlockState(x, y, z, button_by_face[i]);
        break;
      }
    }
  }

  // Remove redundant slime blocks -- ones that
  // are already handled by another axis sweeper.
  // Assign them to x first, then z, and finally y.
  // This makes the required blocks on y smaller.
  // Then, figure out the flying machine layout
  // in reverse order, removing blocks now made redundant
  // by the set flying machines.
  const x_slime_used: Record<Point, boolean> = {};
  const y_slime_used: Record<Point, boolean> = {};
  const z_slime_used: Record<Point, boolean> = {};

  for (const block of Object.keys(accessible_faces) as Array<Point>) {
    const [x, y, z] = parseP(block);
    if (x_slime[p(fx, y, z)]) {
      x_slime_used[p(fx, y, z)] = true;
    }
    else if (z_slime[p(x, y, fz)]) {
      z_slime_used[p(x, y, fz)] = true;
    }
    else if (y_slime[p(x, fy, z)]) {
      y_slime_used[p(x, fy, z)] = true;
    }
  }

  const colors = [
    "#003f5c",
    "#2f4b7c",
    "#665191",
    "#a05195",
    "#d45087",
    "#f95d6a",
    "#ff7c43",
    "#ffa600"
  ];

  console.log('y slime used', y_slime_used);
  create2dView(document.querySelector('.x-axis') as HTMLElement, x_slime_used, x_slime, x_coords, min_bud_y, max_bud_y, min_bud_z, max_bud_z, (y, z) => p(fx, y, z));
  create2dView(document.querySelector('.y-axis') as HTMLElement, y_slime_used, y_slime, y_coords, min_bud_x, max_bud_x, min_bud_z, max_bud_z, (x, z) => p(x, fy, z));
  create2dView(document.querySelector('.z-axis') as HTMLElement, z_slime_used, z_slime, z_coords, min_bud_y, max_bud_y, min_bud_x, max_bud_x, (y, x) => p(x, y, fz));

  function create2dView(
    element: HTMLElement,
    slime_used: Record<Point, boolean>,
    slime: Record<Point, boolean>,
    amethyst_coords: Record<Point, boolean>,
    min_bud_a: number,
    max_bud_a: number,
    min_bud_b: number,
    max_bud_b: number,
    p: (a: number, b: number) => Point) {
    const controllers: Record<Point, ButtonController> = {};
    const container = element.querySelector('.grid') as HTMLElement;
    const machineCountContainer = element.querySelector('.count')!;

    class ButtonController {
      n = 0;
      color = 0;

      constructor(public a: number, public b: number, public type: string, public div: HTMLElement) {
        this.type = type;
        this.div = div;
        this.div.classList.add('block', type);
        this.div.addEventListener('click', (e) => this.onClick(e));
        this.div.style.top = `${(max_bud_a - a + 1) * 32}px`;
        this.div.style.left = `${(b - min_bud_b + 1) * 32}px`;
        this.setNeighbors(false, false, false, false);
      }

      onClick(e: Event) {
        this.div.classList.toggle(this.type);
        if (this.type === 'air') {
          this.type = 'extra-slime';
        } else if (this.type === 'extra-slime') {
          this.type = 'air';
          this.setN(0);
        } else if (this.type === 'slime') {
          this.type = 'regular';
        } else if (this.type === 'regular') {
          this.type = 'slime';
        } else if (this.type === 'optional-air') {
          this.type = 'optional-slime';
        } else if (this.type === 'optional-slime') {
          this.type = 'optional-regular';
        } else if (this.type === 'optional-regular') {
          this.type = 'optional-air';
        }
        this.div.classList.toggle(this.type);
        updateModel(controllers);
      }

      setNeighbors(top: boolean, bottom: boolean, left: boolean, right: boolean) {
        const style = '6px solid';
        this.div.style.borderTop = top ? 'none' : style;
        this.div.style.borderBottom = bottom ? 'none' : style;
        this.div.style.borderLeft = left ? 'none' : style;
        this.div.style.borderRight = right ? 'none' : style;
        this.div.style.borderColor = colors[(this.color ?? 0) % colors.length];
      }

      setColor(color_n: number) {
        this.color = color_n;
        this.div.style.borderColor = colors[color_n % colors.length];
      }

      setN(n: number) {
        this.n = n;
        if (n > 0) {
          this.div.innerText = String(n);
        } else {
          this.div.innerText = '';
        }
        this.div.classList.toggle('invalid', n > 12);
      }

      setInvalid(value: boolean) {
        this.div.classList.toggle('invalid', value);
      }
    }

    container.style.height = `${(max_bud_a - min_bud_a + 3) * 32}px`
    container.style.width = `${(max_bud_b - min_bud_b + 3) * 32}px`
    for (const a of new IntRange(min_bud_a, max_bud_a + 1).expand(1).reverse()) {
      for (const b of new IntRange(min_bud_b, max_bud_b + 1).expand(1)) {
        const div = document.createElement('div');
        container.appendChild(div);
        const index = p(a, b);
        if (slime_used[index]) {
          controllers[index] = new ButtonController(a, b, 'slime', div);
        } else if (amethyst_coords[index]) {
          controllers[index] = new ButtonController(a, b, 'amethyst', div);
        } else if (slime[index]) {
          controllers[index] = new ButtonController(a, b, 'optional-air', div);
        } else {
          controllers[index] = new ButtonController(a, b, 'air', div);
        }
      }
      container.appendChild(document.createElement('br'));
    }

    updateModel(controllers);

    function connectsToSlime(controller: ButtonController) {
      if (!controller) return false;
      return controller.type.includes('slime') || controller.type.includes('regular');
    }

    function connectsToRegular(controller: ButtonController) {
      if (!controller) return false;
      return controller.type.includes('slime');
    }

    function updateModel(controllers: Record<Point, ButtonController>) {
      let currentColor = 0;
      const alreadyFloodFilled: Record<Point, boolean> = {};
      for (const a of new IntRange(min_bud_a, max_bud_a + 1).expand(1).reverse()) {
        for (const b of new IntRange(min_bud_b, max_bud_b + 1).expand(1)) {
          const index = p(a, b);
          controllers[index].setInvalid(false);
          if (!alreadyFloodFilled[index] && controllers[index] && !controllers[index].type.includes('air') && !controllers[index].type.includes('amethyst')) {
            floodFill(a, b, 1, currentColor);
            currentColor = currentColor + 1;
          }
          if (controllers[index].type.includes('slime')) {
            controllers[index].setNeighbors(
              connectsToSlime(controllers[p(a + 1, b)]),
              connectsToSlime(controllers[p(a - 1, b)]),
              connectsToSlime(controllers[p(a, b - 1)]),
              connectsToSlime(controllers[p(a, b + 1)]));
          } else if (controllers[index].type.includes('regular')) {
            controllers[index].setNeighbors(
              connectsToRegular(controllers[p(a + 1, b)]),
              connectsToRegular(controllers[p(a - 1, b)]),
              connectsToRegular(controllers[p(a, b - 1)]),
              connectsToRegular(controllers[p(a, b + 1)]));
          } else {
            controllers[index].setNeighbors(true, true, true, true);
          }
        }
      }
      for (const a of new IntRange(min_bud_a, max_bud_a + 1).expand(1).reverse()) {
        for (const b of new IntRange(min_bud_b, max_bud_b + 1).expand(1)) {
          const index = p(a, b);
          const type = controllers[index].type;
          // detect places where a regular block is touching the slime block of a different machine
          if (type.includes('regular')) {
            if (controllers[p(a + 1, b)] && connectsToRegular(controllers[p(a + 1, b)]) && controllers[p(a + 1, b)].color !== controllers[index].color
              || controllers[p(a - 1, b)] && connectsToRegular(controllers[p(a - 1, b)]) && controllers[p(a - 1, b)].color !== controllers[index].color
              || controllers[p(a, b + 1)] && connectsToRegular(controllers[p(a, b + 1)]) && controllers[p(a, b + 1)].color !== controllers[index].color
              || controllers[p(a, b - 1)] && connectsToRegular(controllers[p(a, b - 1)]) && controllers[p(a, b - 1)].color !== controllers[index].color) {
              controllers[index].setInvalid(true);
            }
          }

          const [x, y, z] = parseP(index);
          const block = {
            'slime': 'minecraft:slime_block',
            'extra-slime': 'minecraft:slime_block',
            'amethyst': 'minecraft:obsidian',
            'regular': 'minecraft:smooth_basalt',
            'optional-regular': 'minecraft:smooth_basalt',
            'optional-slime': 'minecraft:slime_block',
            'optional-air': 'minecraft:air',
          }[type] ?? 'minecraft:air';

          renderer.setBlockState(x, y, z, block);
        }
      }

      machineCountContainer.textContent = String(currentColor);
      function floodFill(a: number, b: number, n: number, color: number) {
        const index = p(a, b);
        if (alreadyFloodFilled[index]) {
          return 0;
        }
        alreadyFloodFilled[index] = true;

        const controller = controllers[index];
        if (!controller) {
          return 0;
        }

        if (n === 1 && controller.type.includes('regular')) {
          // don't process regular blocks if they are first.
          alreadyFloodFilled[index] = false;
          return 0;
        }

        let total_number = 1;
        if (controller.type.includes('slime')) {
          total_number += floodFill(a + 1, b, n + 1, color);
          total_number += floodFill(a - 1, b, n + 1, color);
          total_number += floodFill(a, b + 1, n + 1, color);
          total_number += floodFill(a, b - 1, n + 1, color);
        }

        controller.setN(0);
        if (controller.type.includes('slime') || controller.type.includes('regular')) {
          if (n === 1) {
            controller.setN(total_number);
          }
          controller.setColor(color);
          return total_number;
        }
        return 0;
      }

      renderer.requestRenderIfNotRequested();
    }
  }

  renderer.setBlockState(fx + 2, fy + 2, fz - 0, 'minecraft:sticky_piston[extended=false,facing=up]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 1, 'minecraft:piston[extended=false,facing=up]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 2, 'minecraft:observer[facing=up]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 3, 'minecraft:redstone_lamp[facing=up]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 4, 'minecraft:redstone_lamp[lit=true]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 5, 'minecraft:note_block');
  renderer.setBlockState(fx + 2, fy + 2, fz - 6, 'minecraft:redstone_block');
  renderer.setBlockState(fx + 2, fy + 2, fz - 7, 'minecraft:scaffolding');
  renderer.setBlockState(fx + 2, fy + 2, fz - 8, 'minecraft:scaffolding[bottom=true]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 9, 'minecraft:repeater[delay=1,facing=east,locked=false,powered=true]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 10, 'minecraft:comparator[facing=north,mode=compare,powered=true]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 11, 'minecraft:comparator[facing=north,mode=subtract,powered=false]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 12, 'minecraft:hopper[enabled=true,facing=north]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 13, 'minecraft:hopper[enabled=true,facing=down]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 14, 'minecraft:small_amethyst_bud[facing=up]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 15, 'minecraft:medium_amethyst_bud[facing=up]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 16, 'minecraft:large_amethyst_bud[facing=up]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 17, 'minecraft:amethyst_cluster[facing=down]');
  renderer.setBlockState(fx + 2, fy + 2, fz - 18, 'minecraft:stone_bricks');
  renderer.setBlockState(fx + 2, fy + 2, fz - 19, 'minecraft:amethyst_block');

  // The problem of generating the flying machines:
  // 1. Start with all slime blocks initialized as regular blocks
  // 2. For each possible position of a flying machine, expand outward by converting
  //    blocks to slime until you reach push limit.

  document.getElementById('save')!.onclick = () => {
    saveFile(renderer.toSchematic().save(), 'geode-farm-export.litematic');
  };

  // renderer.animate(-1, 5, (frame) => {
  //   const y = schematic.height - 1 - (frame % schematic.height);
  //   for (let z = 0; z < schematic.length; z++) {
  //     for (let x = 0; x < schematic.width; x++) {
  //       if (renderer.getBlockState(x, y, z) !== 'minecraft:budding_amethyst') {
  //         const mesh = renderer.getBlockMesh(x, y, z);
  //         if (mesh) {
  //           mesh.visible = !mesh.visible;
  //         }
  //       }
  //     }
  //   }

  //   return true;
  // });

}