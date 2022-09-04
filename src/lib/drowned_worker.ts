import { AnvilParser } from "./anvil";
import { getBiomeSourceQuart } from "./biome_source_quart";
import { fileName, readFileOrUrl, sortFilesByDistance } from "./file_access";
import { PaletteManager } from "./litematic";
import { runInWorker } from "./run_in_worker";
import { Virtual2DSet, Virtual3DCanvas, Virtual3DSet } from "./virtual_canvas";

export const processRegionFilesForDrownedFarm = runInWorker(
  ['general'],
  'drownedAfk',
  async (context, seed: bigint, regionFiles: Array<File | string>) => {
    const possibleRivers = new Virtual2DSet();
    const possibleCaves = new Virtual2DSet();
    const rivers = new Virtual3DSet();
    const dripstoneCaves = new Virtual3DSet();
    const lushCaves = new Virtual3DSet();
    const deepDark = new Virtual3DSet();
    const palette = new PaletteManager('minecraft:the_void');
    const canvas = new Virtual3DCanvas();

    sortFilesByDistance(regionFiles);

    let fileI = 0;
    for (const file of regionFiles) {
      context.progress({
        type: 'message',
        message: `Phase 1: ${fileName(file)}... (${Math.floor(fileI / regionFiles.length * 100)}% overall)`
      });

      fileI++;

      const data = new DataView((await readFileOrUrl(file)).buffer);
      const parser = new AnvilParser(data);

      for await (const chunk of parser.chunks()) {
        let hasRiver = false;
        let hasCave = false;
        for (const section of chunk.sections) {
          for (let offsetY = 0; offsetY < 4; offsetY++) {
            for (let offsetZ = 0; offsetZ < 4; offsetZ++) {
              for (let offsetX = 0; offsetX < 4; offsetX++) {
                const x = chunk.xPos * 4 + offsetX;
                const y = section.y * 4 + offsetY;
                const z = chunk.zPos * 4 + offsetZ;
                const biome = section.getBiomeRaw(offsetX, offsetY, offsetZ);
                const index = palette.getOrCreatePaletteIndex(biome);

                canvas.set(x, y, z, index);
                if (biome === 'minecraft:river') {
                  hasRiver = true;
                  rivers.add(x, y, z);
                  possibleRivers.add(x, z);
                  possibleRivers.add(x - 1, z);
                  possibleRivers.add(x - 1, z - 1);
                  possibleRivers.add(x, z - 1);
                  possibleRivers.add(x + 1, z - 1);
                  possibleRivers.add(x + 1, z);
                  possibleRivers.add(x + 1, z + 1);
                  possibleRivers.add(x, z + 1);
                  possibleRivers.add(x - 1, z + 1);
                } else if (biome === 'minecraft:dripstone_caves') {
                  hasCave = true;
                  dripstoneCaves.add(x, y, z);
                  possibleCaves.add(x, z);
                  possibleCaves.add(x - 1, z);
                  possibleCaves.add(x - 1, z - 1);
                  possibleCaves.add(x, z - 1);
                  possibleCaves.add(x + 1, z - 1);
                  possibleCaves.add(x + 1, z);
                  possibleCaves.add(x + 1, z + 1);
                  possibleCaves.add(x, z + 1);
                  possibleCaves.add(x - 1, z + 1);
                } else if (biome === 'minecraft:lush_caves') {
                  hasCave = true;
                  lushCaves.add(x, y, z);
                  possibleCaves.add(x, z);
                  possibleCaves.add(x - 1, z);
                  possibleCaves.add(x - 1, z - 1);
                  possibleCaves.add(x, z - 1);
                  possibleCaves.add(x + 1, z - 1);
                  possibleCaves.add(x + 1, z);
                  possibleCaves.add(x + 1, z + 1);
                  possibleCaves.add(x, z + 1);
                  possibleCaves.add(x - 1, z + 1);
                } else if (biome === 'minecraft:deep_dark') {
                  hasCave = true;
                  deepDark.add(x, y, z);
                  possibleCaves.add(x, z);
                  possibleCaves.add(x - 1, z);
                  possibleCaves.add(x - 1, z - 1);
                  possibleCaves.add(x, z - 1);
                  possibleCaves.add(x + 1, z - 1);
                  possibleCaves.add(x + 1, z);
                  possibleCaves.add(x + 1, z + 1);
                  possibleCaves.add(x, z + 1);
                  possibleCaves.add(x - 1, z + 1);
                }
              }
            }
          }
        }

        context.progress({
          type: 'chunk',
          x: chunk.xPos,
          z: chunk.zPos,
          hasRiver,
          hasCave
        });
      }
    }

    let possibleI = 0;
    let nPossible = Object.keys(possibleRivers.segments).length;
    for (const [sx, sz, data] of possibleRivers) {
      context.progress({
        type: 'message',
        message: `Phase 2: x:${sx * 8} z:${sz}... (${Math.floor(possibleI / nPossible * 100)}% overall)`
      });
      possibleI++;

      for (let z = 0; z < possibleRivers.zSize; z++) {
        for (let xByte = 0; xByte < possibleRivers.xSize; xByte++) {
          let r = possibleRivers.readData(data, xByte, z);
          for (let bit = 0; bit < 8; bit++) {
            context.progress({
              type: 'quart',
              x: bit + 8 * (sx + xByte),
              z: sz + z,
              hasRiver: (r & 1) === 1,
            });

            r >>>= 1;
          }
        }
      }
    }

    possibleI = 0;
    nPossible = Object.keys(possibleCaves.segments).length;
    for (const [sx, sz, data] of possibleCaves) {
      context.progress({
        type: 'message',
        message: `Phase 2.5: x:${sx * 8} z:${sz}... (${Math.floor(possibleI / nPossible * 100)}% overall)`
      });
      possibleI++;

      for (let z = 0; z < possibleCaves.zSize; z++) {
        for (let xByte = 0; xByte < possibleCaves.xSize; xByte++) {
          let r = possibleCaves.readData(data, xByte, z);
          for (let bit = 0; bit < 8; bit++) {
            if (r & 1) {
              context.progress({
                type: 'quart',
                x: bit + 8 * (sx + xByte),
                z: sz + z,
                hasCave: true,
              });
            }

            r >>>= 1;
          }
        }
      }
    }


    possibleI = 0;
    nPossible = Object.keys(possibleRivers.segments).length;
    for (const [sx, sz, data] of possibleRivers) {
      context.progress({
        type: 'message',
        message: `Phase 3: x:${sx * 8} z:${sz}... (${Math.floor(possibleI / nPossible * 100)}% overall)`
      });
      possibleI++;

      for (let z = 0; z < possibleRivers.zSize; z++) {
        for (let xByte = 0; xByte < possibleRivers.xSize; xByte++) {
          let d = possibleRivers.readData(data, xByte, z);
          for (let bit = 0; bit < 8; bit++) {
            if (d & 1) {
              for (let fineZ = 0; fineZ < 4; fineZ++) {
                for (let fineX = 0; fineX < 4; fineX++) {
                  const blockX = 4 * (bit + 8 * (sx + xByte)) + fineX;
                  const blockZ = 4 * (sz + z) + fineZ;
                  let allRiver = true;
                  let someRiver = false;
                  for (let z = -64; z < 0; z++) {
                    const [qx, qy, qz] = getBiomeSourceQuart(seed, blockX, z, blockZ);
                    if (!rivers.has(qx, qy, qz)) {
                      allRiver = false;
                    } else {
                      someRiver = true;
                    }
                  }

                  context.progress({
                    type: 'block',
                    x: blockX,
                    z: blockZ,
                    allRiver,
                    someRiver
                  });
                }
              }
            }

            d >>>= 1;
          }
        }
      }
    }

    /*
    for (let z = -100; z < 100; z++) {
      for (let x = -100; x < 100; x++) {
        const biome = palette.getBlockState(canvas.get(x, -16, z));
        map2.setTileColor(x, z, COLORS[biome] ?? '#999');
      }
    }
    */

    const quart = getBiomeSourceQuart(seed, 66, -6, -154);
    console.log("Sample point:", quart, palette.getBlockState(canvas.get(...quart)));

    /*
    for (const [sx, sz, data] of possibleRivers) {
      for (let z = 0; z < possibleRivers.zSize; z++) {
        for (let xByte = 0; xByte < possibleRivers.xSize; xByte++) {
          let d = possibleRivers.readData(data, xByte, z);
          for (let bit = 0; bit < 8; bit++) {
            if (d & 1) {
              map.setTileColor(bit + 8 * (sx + xByte), sz + z, 'aliceblue');
            }
            d >>>= 1;
          }
        }
      }
    }

    for (const [sx, _sy, sz, data] of rivers) {
      for (let yByte = 0; yByte < rivers.ySize; yByte++) {
        for (let z = 0; z < rivers.zSize; z++) {
          for (let x = 0; x < rivers.xSize; x++) {
            const d = rivers.readData(data, x, yByte, z);
            if (d) {
              map.setTileColor(sx + x, sz + z, 'blue');
            }
          }
        }
      }
    }

    for (const [sx, _sy, sz, data] of dripstoneCaves) {
      for (let yByte = 0; yByte < dripstoneCaves.ySize; yByte++) {
        for (let z = 0; z < dripstoneCaves.zSize; z++) {
          for (let x = 0; x < dripstoneCaves.xSize; x++) {
            const d = dripstoneCaves.readData(data, x, yByte, z);
            if (d) {
              map.setTileColor(sx + x, sz + z, 'red');
            }
          }
        }
      }
    }

    for (const [sx, _sy, sz, data] of lushCaves) {
      for (let yByte = 0; yByte < lushCaves.ySize; yByte++) {
        for (let z = 0; z < lushCaves.zSize; z++) {
          for (let x = 0; x < lushCaves.xSize; x++) {
            const d = lushCaves.readData(data, x, yByte, z);
            if (d) {
              map.setTileColor(sx + x, sz + z, 'green');
            }
          }
        }
      }
    }

    for (const [sx, _sy, sz, data] of deepDark) {
      for (let yByte = 0; yByte < deepDark.ySize; yByte++) {
        for (let z = 0; z < deepDark.zSize; z++) {
          for (let x = 0; x < deepDark.xSize; x++) {
            const d = deepDark.readData(data, x, yByte, z);
            if (d) {
              map.setTileColor(sx + x, sz + z, 'black');
            }
          }
        }
      }
    }

    map.requestRender();
    map.addEventListener('mousemove', (x, z) => {
      hover.textContent = `x:${x * 4 + 2} z:${z * 4 + 2}`;
    });
    map2.addEventListener('mousemove', (x, z) => {
      hover.textContent = `x:${x} z:${z}`;
    });
    */

  });