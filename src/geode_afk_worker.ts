import { AnvilParser } from "./anvil";
import { readFileOrUrl } from "./file_access";
import { p, Point } from "./point";
import { runInWorker, WorkerContext } from "./run_in_worker";

export const getBuddingAmethystPerChunk = runInWorker(
  ['general'],
  'budding_chunks',
  async (context: WorkerContext, regionFile: File | string) => {
    const byChunk: Record<Point, number> = {};
    const fileContents = await readFileOrUrl(regionFile);
    const parser = new AnvilParser(new DataView(fileContents.buffer));
    for await (const chunk of parser.chunks()) {
      let buddingInChunk = 0;
      let hasSections = false;
      for (const section of chunk.sections) {
        hasSections = true;
        const budding = section.palette.indexOf('minecraft:budding_amethyst');
        if (budding !== -1) {
          // expand blockstates by requesting one
          section.getBlockState(0, 0, 0);
          for (const value of section.blockStates ?? []) {
            if (value === budding) {
              buddingInChunk++;
            }
          }
        }
      }
      // ignore empty chunks
      if (hasSections) {
        byChunk[p(chunk.xPos, 0, chunk.zPos)] = buddingInChunk;
      }
    }

    return byChunk;
  });