import { Renderer } from './renderer';
import { SchematicReader } from './litematic';
import { $, assertNotNull } from './util';
import { parseP, Point } from './point';
import { decompress } from './compression';

const embeddedSchematics = new Map<Element, { renderer: Renderer, schematic: SchematicReader }>();

export async function loadEmbeddedSchematics() {
  const elements = document.querySelectorAll('object[type="application/vnd.litematica+nbt"]') as NodeListOf<HTMLObjectElement>;
  const fetchData = await Promise.all(Array.from(elements).map(async embed => {
    const url = embed.getAttribute('data');
    if (url == null) { throw new Error('embedded litematic must have a [data] attribute.'); }
    const response = await fetch(url);
    if (!response.ok) {
      return { embed, data: null };
    }
    return { embed, data: await response.arrayBuffer() };
  }));

  for (const { embed, data } of fetchData) {
    if (data) {
      const canvas = $('#canvas', HTMLCanvasElement);

      const renderer = new Renderer(canvas);
      renderer.controls.autoRotate = embed.dataset['autorotate'] === "true";
      canvas.addEventListener('dblclick', () => {
        console.log(renderer.controls.target, renderer.camera.position);
      });
      const unpackedData = await decompress(new Uint8Array(data));
      const schematic = new SchematicReader(unpackedData);
      for (let y = 0; y < schematic.height; y++) {
        for (let z = 0; z < schematic.length; z++) {
          for (let x = 0; x < schematic.width; x++) {
            const block = schematic.getBlock(x, y, z);
            renderer.setBlockState(x, y, z, block);
          }
        }
      }

      embeddedSchematics.set(embed, {
        renderer, schematic
      });

      const cameraCoords = embed.dataset['camera'];
      const targetCoords = embed.dataset['target'];
      if (cameraCoords != null && targetCoords != null) {
        const camera = parseP(cameraCoords as Point);
        const target = parseP(targetCoords as Point);
        renderer.camera.position.set(camera[0], camera[1], camera[2]);
        renderer.controls.target.set(target[0], target[1], target[2]);
      } else {
        renderer.controls.target.set(schematic.width / 2, schematic.height / 2, schematic.length / 2);
      }
    }
  }

  for (const revealer of document.querySelectorAll('.revealer') as Iterable<HTMLInputElement>) {
    const updateSchematic = () => {
      const forId = assertNotNull(revealer.getAttribute('for'));
      const forElement = assertNotNull(document.getElementById(forId));
      const { renderer, schematic } = assertNotNull(embeddedSchematics.get(forElement));
      const fraction = 1 - Number(revealer.value) / 100;
      const targetHeight = Math.round(schematic.height * fraction);
      console.log(targetHeight);
      for (let y = 0; y < schematic.height; y++) {
        for (let z = 0; z < schematic.length; z++) {
          for (let x = 0; x < schematic.width; x++) {
            const block = schematic.getBlock(x, y, z);
            if (block === 'minecraft:smooth_basalt' || block === 'minecraft:calcite' || block === 'minecraft:amethyst_block') {
              const mesh = renderer.getBlockMesh(x, y, z);
              if (mesh) {
                mesh.visible = y < targetHeight;
              }
            }
          }
        }
      }
    };
    revealer.addEventListener('sl-change', () => {
      updateSchematic();
    });
    updateSchematic();
  }
}