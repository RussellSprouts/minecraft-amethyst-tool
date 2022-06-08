import { AnvilParser, RegionCollection } from "./anvil";
import { readFile } from "./file_access";
import { runInWorker, WorkerContext } from "./run_in_worker";

export const processRegionFiles = runInWorker(['general'], 'regions',
  async (context: WorkerContext, fileList: FileList) => {
    const regionCollection = new RegionCollection(fileList);
    console.log("READING RANDOM POINT", await regionCollection.getBlockState(527, 9, -1813));

    const start = Date.now();
    console.log('START', start);
    let totalProgress = 0;
    await Promise.all(Array.from(fileList).map(async file => {
      const fileContents = await readFile(file);
      const parser = new AnvilParser(new DataView(fileContents.buffer));
      const allBlocks = await parser.countBlocks('minecraft:calcite');
      console.log('BUDDING', allBlocks.size, allBlocks);
      totalProgress++;
      context.progress(100 * totalProgress / fileList.length);
    }));

    context.progress(100);
    console.log('END', Date.now() - start);
  });