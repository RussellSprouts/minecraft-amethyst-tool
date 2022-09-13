import { AnvilParser } from "./anvil";
import { fileName, readFileOrUrl, sortFilesSpiral } from "./file_access";
import { runInWorker } from "./run_in_worker";
import { Virtual2DSet, Virtual2DSetArea, Virtual3DSet } from "./virtual_canvas";
import { assembly } from "./load_assembly";
import { p, Point } from "./point";
import { formatTime, Speedometer } from "./speedometer";

let cancelRequested = false;

export const cancelWorldLoading = runInWorker(
  ['general'],
  'cancelWorldLoading', async () => {
    cancelRequested = true;
  });

export const processRegionFilesForDrownedFarm = runInWorker(
  ['general'],
  'drownedAfk',
  async (context, seed: bigint, regionFiles: Array<File | string>) => {
    cancelRequested = false;

    const { getBiomeSourceQuart, biomeX, biomeY, biomeZ } = await assembly;

    const possibleRivers = new Virtual2DSet();
    const possibleCaves = new Virtual2DSet();
    const rivers = new Virtual3DSet();
    const allCaves = new Virtual3DSet();

    // An estimate of the maximum number of river blocks
    // that could be in range of the given chunk coords.
    // Assumes that all chunks with a river block are
    // completely river.
    const maximumColumnsChunk: Record<Point, number> = {};
    let bestChunkValue = 0;
    let bestChunk = p(0, 0, 0);

    sortFilesSpiral(regionFiles);

    const chunksPerSecond = new Speedometer();
    let fileI = 0;

    regionFiles: for (const file of regionFiles) {
      context.progress({
        type: 'message',
        message: `Loading world ${Math.floor(fileI / regionFiles.length * 100)}% (phase 1/2):\n${fileName(file)}...\n${chunksPerSecond.workPerSecond().toFixed(1)} chunks/s. ${formatTime(chunksPerSecond.timeToCompletion(regionFiles.length * 1024))} left.`
      });

      fileI++;

      const data = new DataView((await readFileOrUrl(file)).buffer);
      const parser = new AnvilParser(data);

      for await (const chunk of parser.chunks()) {
        if (cancelRequested) {
          break regionFiles;
        }
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
                } else if (biome === 'minecraft:dripstone_caves' || biome === 'minecraft:lush_caves' || biome === 'deep_dark') {
                  hasCave = true;
                  allCaves.add(x, y, z);
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

        if (hasRiver) {
          // If there is a cave in this chunk, then
          // assume that it might cover 1/4 of the chunk.
          // Most caves are fairly large, so this should still
          // be an over-estimate.
          const increment = hasCave ? 192 : 256;
          // Increment all of the nearby chunks by 256,
          // the maximum if this chunk is completely river.
          for (let z = -8; z <= 8; z++) {
            for (let x = -8; x <= 8; x++) {
              if (x * x + z * z < 8 * 8) {
                const point = p(chunk.xPos + x, 0, chunk.zPos + z);
                const newValue = (maximumColumnsChunk[point] ?? 0) + increment;
                if (newValue > bestChunkValue) {
                  bestChunkValue = newValue;
                  bestChunk = point;
                }
                maximumColumnsChunk[point] = newValue;
              }
            }
          }
        }

        context.progress({
          type: 'chunk',
          x: chunk.xPos * 16,
          z: chunk.zPos * 16,
          hasRiver,
          hasCave: hasRiver && hasCave,
        });
        chunksPerSecond.didWork();
      }
    }

    context.progress({
      type: 'estimates',
      maximumColumnsChunk,
      best: bestChunkValue,
      bestChunk
    });

    const possibleRiverAreas = possibleRivers.areas();

    function bestChunkInArea(area: Virtual2DSetArea): number {
      let best = 0;
      for (let z = 0; z < 16; z += 4) {
        for (let x = 0; x < 16; x += 4) {
          const chunkX = (area.areaX * 16 + x) / 4;
          const chunkZ = (area.areaZ * 16 + z) / 4;
          const chunkP = p(chunkX, 0, chunkZ);
          if (maximumColumnsChunk[chunkP] > best) {
            best = maximumColumnsChunk[chunkP];
          }
        }
      }
      return best;
    }
    possibleRiverAreas.sort((a, b) => {
      return bestChunkInArea(b) - bestChunkInArea(a);
    });

    // The set of areas that we've already counted.
    const areasAlreadyResolved = new Virtual2DSet();
    const riverColumns = new Virtual2DSet();

    let best = 0;
    let bestX = 0;
    let bestZ = 0;

    // For the given area, finds the x,y coordinate with the most
    // river biome columns nearby.
    function resolveArea(center: Virtual2DSetArea) {
      const areasNearby = possibleRivers.radius(3, center.areaX, center.areaZ);

      // Process all chunks in a radius around the center that
      // could affect an AFK in the center.
      for (const area of areasNearby) {
        if (areasAlreadyResolved.has(area.areaX, area.areaZ)) {
          continue;
        }
        areasAlreadyResolved.add(area.areaX, area.areaZ);

        const absoluteAreaX = area.areaX * 16 * 4;
        const absoluteAreaZ = area.areaZ * 16 * 4;

        // For each chunk
        for (let chunkZ = 0; chunkZ < 4; chunkZ++) {
          for (let chunkX = 0; chunkX < 4; chunkX++) {
            const absoluteChunkX = absoluteAreaX + chunkX * 16;
            const absoluteChunkZ = absoluteAreaZ + chunkZ * 16;

            let chunkAllRiver = true;
            let chunkSomeRiver = false;
            let chunkSomeCave = false;

            // For each quart in the chunk
            for (let quartZ = 0; quartZ < 4; quartZ++) {
              for (let quartX = 0; quartX < 4; quartX++) {
                const absoluteQuartX = absoluteChunkX + quartX * 4;
                const absoluteQuartZ = absoluteChunkZ + quartZ * 4;

                // If these blocks might be river
                if (possibleRivers.readInArea(
                  area.array,
                  area.offset,
                  chunkX * 4 + quartX,
                  chunkZ * 4 + quartZ)
                ) {
                  let quartAllRiver = true;
                  let quartSomeRiver = false;
                  let quartSomeCave = false;

                  // For each block in the quart
                  for (let blockZ = 0; blockZ < 4; blockZ++) {
                    for (let blockX = 0; blockX < 4; blockX++) {
                      const x = absoluteQuartX + blockX;
                      const z = absoluteQuartZ + blockZ;

                      let allRiver = true;
                      let someCaves = false;
                      let someRiver = false;
                      // For the whole column y
                      for (let y = -64; y < 64; y++) {
                        getBiomeSourceQuart(seed, x, y, z);
                        const qx = biomeX.value;
                        const qy = biomeY.value;
                        const qz = biomeZ.value;
                        if (!rivers.has(qx, qy, qz)) {
                          allRiver = false;
                          quartAllRiver = false;
                          chunkAllRiver = false;
                          if (allCaves.has(qx, qy, qz)) {
                            someCaves = true;
                            quartSomeCave = true;
                            chunkSomeCave = true;
                          }
                        } else {
                          someRiver = true;
                          quartSomeRiver = true;
                          chunkSomeRiver = true;
                        }
                      }

                      if (!someCaves && someRiver) {
                        riverColumns.add(x, z);
                      }

                      context.progress({
                        type: 'block',
                        x,
                        z,
                        allRiver,
                        someRiver,
                        someCaves,
                      });
                    }
                  }

                  context.progress({
                    type: 'quart-block',
                    x: absoluteQuartX,
                    z: absoluteQuartZ,
                    quartAllRiver: quartAllRiver && quartSomeRiver,
                    quartSomeRiver,
                    quartSomeCave
                  });
                } else {
                  context.progress({
                    type: 'quart-block',
                    x: absoluteQuartX,
                    z: absoluteQuartZ,
                    quartAllRiver: false,
                    quartSomeRiver: false,
                    quartSomeCave: false
                  });
                }
              }
            }

            context.progress({
              type: 'chunk-block',
              x: absoluteChunkX,
              z: absoluteChunkZ,
              chunkAllRiver: chunkAllRiver && chunkSomeRiver,
              chunkSomeRiver,
              chunkSomeCave,
            });
          }
        }
      }

      // Now check for each block in the center, how many river
      // biome columns are within 128 blocks.
      const results = new Uint32Array(64 * 64);
      const centerX = center.areaX * 64;
      const centerZ = center.areaZ * 64;

      for (const blockArea of riverColumns.areas()) {
        for (let offsetZ = 0; offsetZ < 16; offsetZ++) {
          for (let offsetX = 0; offsetX < 16; offsetX++) {
            const x = blockArea.areaX * 16 + offsetX;
            const z = blockArea.areaZ * 16 + offsetZ;
            if (riverColumns.readInArea(blockArea.array, blockArea.offset, offsetX, offsetZ)) {
              for (let centerOffsetZ = 0; centerOffsetZ < 64; centerOffsetZ++) {
                for (let centerOffsetX = 0; centerOffsetX < 64; centerOffsetX++) {
                  const targetX = centerX + centerOffsetX;
                  const targetZ = centerZ + centerOffsetZ;
                  const dx = x - targetX;
                  const dz = z - targetZ;
                  if (dx * dx + dz * dz < 128 * 128) {
                    results[centerOffsetX + 64 * centerOffsetZ]++;
                  }
                }
              }
            }
          }
        }
      }

      for (let centerOffsetZ = 0; centerOffsetZ < 64; centerOffsetZ++) {
        for (let centerOffsetX = 0; centerOffsetX < 64; centerOffsetX++) {
          const result = results[centerOffsetX + centerOffsetZ * 64];
          if (result > best) {
            best = result;
            bestX = centerX + centerOffsetX;
            bestZ = centerZ + centerOffsetZ;
          }
        }
      }

      console.log("BEST", best, bestX, bestZ);
    }

    while (possibleRiverAreas.length) {
      const bestCandidate = possibleRiverAreas.shift()!;
      const bestPossibleSize = bestChunkInArea(bestCandidate);
      if (bestPossibleSize < best) {
        context.progress({
          type: 'message',
          message: `Complete.\nCandidate ${bestPossibleSize} is too small.\nBest found: ${best} @ x:${bestX} z:${bestZ}`
        });
        break;
      }
      context.progress({
        type: 'message',
        message:
          `Evaluating x:${bestCandidate.areaX * 64} z:${bestCandidate.areaZ * 64}\nUp to: ${bestPossibleSize}\nBest found: ${best} @ x:${bestX} z:${bestZ}`
      });
      resolveArea(bestCandidate);
    }
  });