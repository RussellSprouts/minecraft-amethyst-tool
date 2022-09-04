/**
 * Finds the best spot to AFK for a giant drowned farm.
 * Looks for the AFK sphere with the most river biome
 * spaces. It only considers columns which don't have
 * blocks of other biomes like dripstone caves.
 * 
 * 1. The chunk nbt includes the biome information, but
 *    only at a 4x4x4 block resolution. There is a noise-based
 *    zoom effect which shifts the boundaries of the biomes
 *    to make this look more natural.
 * 2. If a block has a coordinate x, then Math.floor((x-2)/4) or
 *    Math.floor((x-2)/4) + 1 from the biome info is the biome,
 *    depending on the noise. The y coordinate is clamped to the
 *    buildable heights.
 * 3. Using that info, we should be able to make a map of columns
 *    that are possibly all river biome. If every square of the
 *    column has a river biome close enough, then the column may
 *    be all river. Save the locations of river biome 4x4x4 regions
 *    around those blocks.
 * 4. Find which columns are actually all river biome.
 * 5. Search for AFK spots with many river biome blocks nearby.
 *    Blocks at least 24 blocks away, but less than 256 blocks
 *    away are spawnable. Maximize that number.
 */

import { AnvilParser } from "./lib/anvil";
import { getBiomeSourceQuart } from "./lib/biome_source_quart";
import { processRegionFilesForDrownedFarm } from "./lib/drowned_worker";
import { PaletteManager } from "./lib/litematic";
import { MapRenderer } from "./lib/map";
import { enableWorkers } from "./lib/run_in_worker";
import { Seed } from "./lib/seed";
import { $ } from './lib/util';
import { Virtual2DSet, Virtual3DCanvas, Virtual3DSet } from "./lib/virtual_canvas";

enableWorkers();

const COLORS: Record<string, string> = {
  'minecraft:river': 'blue',
  'minecraft:eroded_badlands': 'orange',
  'minecraft:forest': 'green',
  'minecraft:dripstone_caves': 'red',
  'minecraft:badlands': '#ffdd00',
  'minecraft:desert': 'tan',
  'minecraft:warm_ocean': '#ff3333',
  'minecraft:savanna': '#dd3333',
  'minecraft:plains': '#22dd22',
  'minecraft:beach': 'yellow',
  'minecraft:sparse_jungle': '#66ff66',
  'minecraft:jungle': '#88ff88',
  'minecraft:stony_shore': 'grey'
};

const seedInput = $('#seed', HTMLInputElement);
const regionFiles = $('#region-files', HTMLInputElement);
const hover = $('#hover');
const message = $('#message');
const map = new MapRenderer('#map');

const map2 = new MapRenderer('#map2');
regionFiles.addEventListener('change', async () => {
  const files = regionFiles.files;
  if (files && files.length) {
    const seed = await new Seed(seedInput.value).biomeSeed();
    const { progress, promise } = processRegionFilesForDrownedFarm(seed, Array.from(files));
    progress.addEventListener('progress', (e) => {
      const c = e as CustomEvent;
      if (c.detail.type === 'chunk') {
        const color = c.detail.hasCave ? '#91322f' : c.detail.hasRiver ? '#5373bd' : '#aefca7';
        map.setTileColor(c.detail.x * 16, c.detail.z * 16, color, 16);
        map.requestRender();
      } else if (c.detail.type === 'quart') {
        const color = c.detail.hasCave ? 'red' : c.detail.hasRiver ? '#1e52c9' : '#35c91e';
        map.setTileColor(c.detail.x * 4, c.detail.z * 4, color, 4);
        map.requestRender();
      } else if (c.detail.type === 'block') {
        const color = c.detail.allRiver ? 'blue' : c.detail.someRiver ? '#003' : 'green';
        map.setTileColor(c.detail.x, c.detail.z, color, 1);
        map.requestRender();
      } else if (c.detail.type === 'message') {
        message.textContent = c.detail.message;
      }
    });

    map.requestRender();
    map.addEventListener('mousemove', (x, z) => {
      hover.textContent = `x:${x} z:${z}`;
    });
    map2.addEventListener('mousemove', (x, z) => {
      hover.textContent = `x:${x} z:${z}`;
    });

  }
});