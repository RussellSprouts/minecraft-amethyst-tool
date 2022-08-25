import { runInWorker } from "./run_in_worker";

export const getPatternData = runInWorker(['general'], 'getPattern', async (context, INCREMENTS: number) => {
  const patterns = new Map<bigint, Array<{ x: number, z: number }>>();
  // for each spot in the chunk, in increments
  for (let x = 0; x < INCREMENTS; x++) {
    for (let z = 0; z < INCREMENTS; z++) {
      const pattern = [];
      // for each chunk that might be in range.
      for (let zOffset = -8; zOffset <= 8; zOffset++) {
        for (let xOffset = -8; xOffset <= 8; xOffset++) {
          const currentX = x / INCREMENTS;
          const currentZ = z / INCREMENTS;
          const targetX = xOffset + 0.5;
          const targetZ = zOffset + 0.5;
          const dx = currentX - targetX;
          const dy = currentZ - targetZ;
          pattern.push(dx * dx + dy * dy < 64 ? '1' : '0');
        }
      }
      const bigint = BigInt(`0b${pattern.reverse().join('')}`);
      if (patterns.has(bigint)) {
        patterns.get(bigint)!.push({ x, z });
      } else {
        patterns.set(bigint, [{ x, z }]);
      }
    }
  }
  return patterns;
});