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

import { cancelWorldLoading, processRegionFilesForDrownedFarm } from "./lib/drowned_worker";
import { MapRenderer } from "./lib/map";
import { enableWorkers } from "./lib/run_in_worker";
import { Seed } from "./lib/seed";
import { $, assertInstanceOf, assertNotNull } from './lib/util';
import { p, Point } from "./lib/point";
import { activateHidingCheckboxes } from "./lib/hiding_checkbox";
import { activateFileSelects } from "./lib/file_select";

enableWorkers();
activateHidingCheckboxes();
activateFileSelects();

const seedInput = $('#seed', HTMLInputElement);
const regionFiles = $('#region-files', HTMLInputElement);
const hover = $('#hover');
const message = $('#message');
const map = new MapRenderer('#map');
const seedForm = $('#seed-form', HTMLFormElement);
const regionFilesForm = $('#region-files-form', HTMLFormElement);
const cancelButton = $('#cancel-button', HTMLButtonElement);
map.requestRender();

function setStep(n: number) {
  for (const elt of document.querySelectorAll('.step')) {
    const step = assertInstanceOf(elt, HTMLElement);
    const stepNumber = assertNotNull(step.dataset['step']);
    step.classList.toggle('hidden', parseInt(stepNumber) > n);
  }
}

seedForm.addEventListener('submit', (e) => {
  e.preventDefault();
  setStep(2);
});

regionFilesForm.addEventListener('submit', (e) => {
  e.preventDefault();
  setStep(3);
});

cancelButton.addEventListener('click', () => {
  if (confirm("This will stop loading the rest of the world!")) {
    cancelWorldLoading();
  }
});

regionFiles.addEventListener('change', async () => {
  const files = regionFiles.files;
  const maximumColumnsChunk: Record<Point, number> = {};
  const maximumColumnsQuart: Record<Point, number> = {};

  if (files && files.length) {
    const seed = await new Seed(seedInput.value).biomeSeed();
    const { progress, promise } = processRegionFilesForDrownedFarm(seed, Array.from(files));

    progress.addEventListener('progress', (e) => {
      const c = e as CustomEvent;
      if (c.detail.type === 'chunk') {
        const color = c.detail.hasCave ? '#91322f' : c.detail.hasRiver ? '#5373bd' : '#aefca7';
        map.setTileColor(c.detail.x, c.detail.z, color, 16);
        map.requestRender();
      } else if (c.detail.type === 'quart') {
        const color = c.detail.hasCave ? 'red' : c.detail.hasRiver ? '#1e52c9' : '#35c91e';
        map.setTileColor(c.detail.x, c.detail.z, color, 4);
        map.requestRender();
      } else if (c.detail.type === 'block') {
        const color = c.detail.allRiver ? 'blue' : c.detail.someCave ? 'red' : c.detail.someRiver ? '#009' : 'green';
        map.setTileColor(c.detail.x, c.detail.z, color, 1);
        map.requestRender();
      } else if (c.detail.type === 'message') {
        message.textContent = c.detail.message;
      } else if (c.detail.type === 'chunk-quart') {
        const x = c.detail.x;
        const z = c.detail.z;
        const color = map.getTileColor(x, z, 16);
        const newColor = color === '#91322f' ? 'red' : color === '#5373bd' ? '#1e52c9' : color;
        map.setTileColor(x, z, newColor, 16);
        map.requestRender();
      } else if (c.detail.type === 'estimates') {
        console.log('BEST:', c.detail);
        Object.assign(maximumColumnsChunk, c.detail.maximumColumnsChunk ?? {});
        Object.assign(maximumColumnsQuart, c.detail.maximumColumnsQuart ?? {});
      } else if (c.detail.type === 'quart-block') {
        const color = c.detail.quartAllRiver ? 'blue' : c.detail.quartSomeCave ? 'red' : c.detail.quartSomeRiver ? '#009' : 'green';
        map.setTileColor(c.detail.x, c.detail.z, color, 4);
        map.requestRender();
      } else if (c.detail.type === 'chunk-block') {
        const color = c.detail.chunkAllRiver ? 'blue' : c.detail.chunkSomeCave ? 'red' : c.detail.chunkSomeRiver ? '#009' : 'green';
        map.setTileColor(c.detail.x, c.detail.z, color, 16);
        map.requestRender();
      }
    });

    map.requestRender();
    map.addEventListener('mousemove', (x, z) => {
      const quart = p(Math.floor(x / 4), 0, Math.floor(z / 4));
      const chunk = p(Math.floor(x / 16), 0, Math.floor(z / 16));
      const max = maximumColumnsQuart[quart] ?? maximumColumnsChunk[chunk] ?? '??';
      hover.textContent = `x:${x} z:${z} <${max} river columns`;
    });
  }
});
