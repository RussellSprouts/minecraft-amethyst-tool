import { AnvilParser } from "./anvil";
import { readFile } from "./file_access";
import { p } from "./point";
import { runInWorker, WorkerContext } from "./run_in_worker";
import { parallelMap } from "./util";

export const processRegionFiles = runInWorker(['general'], 'regions',
  async (context: WorkerContext, fileList: FileList) => {
    const start = Date.now();
    console.log('START', start);
    let totalProgress = 0;
    await parallelMap(Array.from(fileList), { max: 8 }, async file => {
      const fileContents = await readFile(file);
      const parser = new AnvilParser(new DataView(fileContents.buffer));
      const allBlocks = new Set<string>();
      for await (const section of parser.sections()) {
        if (section.palette.indexOf('minecraft:budding_amethyst')) {
          for (let y = 0; y < 16; y++) {
            for (let z = 0; z < 16; z++) {
              for (let x = 0; x < 16; x++) {
                if (section.getBlockState(x, y, z) === 'minecraft:budding_amethyst') {
                  allBlocks.add(p(section.chunk.xPos * 16 + x, section.y * 16 + y, section.chunk.zPos * 16 + z));
                }
              }
            }
          }
        }
      }
      console.log('BUDDING', allBlocks.size, allBlocks);
      totalProgress++;
      context.progress(100 * totalProgress / fileList.length);
    });

    context.progress(100);
    console.log('END', Date.now() - start);
  });