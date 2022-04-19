import * as pako from 'pako';
import { blockState } from './litematic';
import { readLongPackedArray } from './long_packed_array';
import { Nbt, ShapeToInterface } from './nbt';
import { p, Point } from './point';
import { Renderer } from './renderer';

const enum DataVersions {
  // First snapshot that leaves extra bits at the end of blockState arrays
  SNAPSHOT_20w17a = 2529,
  // First snapshot that uses new format for sections in chunk
  SNAPSHOT_21w37a = 2834,
  // First snapshot that uses new format for top-level info
  SNAPSHOT_21w43a = 2844,
}

export const enum HeightMap {
  MOTION_BLOCKING = 'MOTION_BLOCKING',
  MOTION_BLOCKING_NO_LEAVES = 'MOTION_BLOCKING_NO_LEAVES',
  OCEAN_FLOOR = 'OCEAN_FLOOR',
  OCEAN_FLOOR_WG = 'OCEAN_FLOOR_WG',
  WORLD_SURFACE = 'WORLD_SURFACE',
  WORLD_SURFACE_WG = 'WORLD_SURFACE_WG',
}

const SECTOR_SIZE = 4096;

/**
 * Parses an Anvil Region file.
 * 
 * Format:
 * interface RegionFile {
 *    // offset of the chunk in the file
 *    locations: ChunkLocation[1024];
 *    // last modification time in epoch seconds
 *    timestamps: uint32[1024];
 *    // list of chunks, each taking up whole sectors
 *    ...chunks: Chunk[];
 * }
 * 
 * interface ChunkLocation {
 *    offset: uint24; // offset in sectors
 *    length: uint8; // length in sectors
 * }
 * 
 * interface Chunk {
 *    length: uint32; // length in bytes
 *    // gzip, zlib, or uncompressed. Add 128 if chunk is in a separate file instead of inline
 *    // If in a separate file, it will be a c.{x}.{z}.mcc file.
 *    compressionType: uint8 & (1|2|3|129|130|131)
 *    compressedData: uint8[this.length-1];
 * }
 */
export class AnvilParser {
  private parsedChunks: Record<string, ChunkData> = {};
  constructor(private input: DataView) {
  }

  /**
   * Gets the offset of the chunk data in the input.
   * Returns -1 if the chunk is empty.
   */
  private chunkOffset(x: number, z: number) {
    const index = 4 * ((x & 31) + 32 * (z & 31));
    const length = this.input.getUint8(index + 3);
    if (length <= 0) {
      return -1;
    }

    return (this.input.getUint32(index) >> 8) * SECTOR_SIZE;
  }

  /**
   * Counts all of the blocks of the specified type.
   * Returns a map of chunk coordinate to number of blocks.
   */
  countBlocks(state: string): Record<Point, number> {
    const result: Record<Point, number> = {};
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        const startIndex = this.chunkOffset(x, z);
        if (startIndex < 0) { continue; }
        const dataLength = this.input.getUint32(startIndex);
        const compressionType = this.input.getUint8(startIndex + 4);
        const compressedData = new Uint8Array(this.input.buffer, startIndex + 5, dataLength - 1);
        const uncompressed = pako.ungzip(compressedData);
        const nbtParser = new Nbt(CHUNK_FORMAT_SHAPE);
        const data = nbtParser.parse(uncompressed);
        const chunk = new ChunkData(data);
        console.log(data);
        let chunkTotal = 0;
        for (const section of chunk.sections) {
          if (section.palette.indexOf(state) !== -1) {
            for (let y = 0; y < 16; y++) {
              for (let z = 0; z < 16; z++) {
                for (let x = 0; x < 16; x++) {
                  if (section.getBlockState(x, y, z) === state) {
                    chunkTotal++;
                  }
                }
              }
            }
          }
        }
        if (chunkTotal > 0) {
          result[p(chunk.xPos, 0, chunk.zPos)] = chunkTotal;
        }
      }
    }
    return result;
  }

  parseChunk(x: number, z: number, allBlocks: Set<string>, renderer: Renderer, blockCounts: Map<string, number>) {
    const index = `${x}:${z}`;
    if (this.parsedChunks[index]) {
      return this.parsedChunks[index];
    }

    const startIndex = this.chunkOffset(x, z);
    if (startIndex !== -1) {
      const dataLength = this.input.getUint32(startIndex);
      const compressionType = this.input.getUint8(startIndex + 4);
      const compressedData = new Uint8Array(this.input.buffer, startIndex + 5, dataLength - 1);
      performance.mark('a')
      const uncompressed = pako.ungzip(compressedData);
      const basicNbtParser = new Nbt('*');
      const nbtParser = new Nbt(CHUNK_FORMAT_SHAPE);

      console.log('Unshaped-data', basicNbtParser.parse(uncompressed));
      performance.mark('b');
      performance.measure('unzip', 'a', 'b');
      const data = nbtParser.parse(uncompressed);
      const chunk = new ChunkData(data);
      this.parsedChunks[index] = chunk;

      performance.mark('c');
      performance.measure('nbt-parse', 'b', 'c');
      for (const section of chunk.sections) {
        const palette = section.palette;
        const startY = section.y;
        for (const state of palette) {
          allBlocks.add(state);
        }
        for (let y = 0; y < 16; y++) {
          for (let z = 0; z < 16; z++) {
            for (let x = 0; x < 16; x++) {
              const stateString = section.getBlockState(x, y, z);
              blockCounts.set(stateString, (blockCounts.get(stateString) ?? 0) + 1);
              // renderer.setBlockState(x, startY * 16 + y, z, stateString);
            }
          }
        }
      }

      for (let z = 0; z < 16; z++) {
        for (let x = 0; x < 16; x++) {
          const height = chunk.getHeightMap(HeightMap.WORLD_SURFACE, x, z) - 65;
          renderer.setBlockState(x, height, z, chunk.getBlockState(x, height, z));
        }
      }

      performance.mark('d');
      performance.measure('decode', 'c', 'd');
    }
  }
}

const MINECRAFT_SECTION = {
  'Y': 'byte',

  // 21w37a+
  'block_states': {
    'data': 'longArray',
    'palette': [{
      'Name': 'string',
      'Properties': { '*': 'string' }
    }],
  },

  // older versions
  'BlockStates': 'longArray',
  'Palette': [{
    'Name': 'string',
    'Properties': { '*': 'string' },
  }],
} as const;

const HEIGHT_MAPS = {
  'MOTION_BLOCKING': 'longArray',
  'MOTION_BLOCKING_NO_LEAVES': 'longArray',
  'OCEAN_FLOOR': 'longArray',
  'OCEAN_FLOOR_WG': 'longArray',
  'WORLD_SURFACE': 'longArray',
  'WORLD_SURFACE_WG': 'longArray',
} as const;

const CHUNK_FORMAT_SHAPE = {
  'DataVersion': 'int',

  // 21w43a+
  'sections': [MINECRAFT_SECTION],
  'xPos': 'int',
  'zPos': 'int',
  'Heightmaps': HEIGHT_MAPS,

  // older versions
  'Level': {
    'xPos': 'int',
    'zPos': 'int',
    'Status': 'string',
    'Sections': [MINECRAFT_SECTION],
    'Heightmaps': HEIGHT_MAPS
  },
} as const;

type Section = ShapeToInterface<typeof MINECRAFT_SECTION>;

class ChunkData {
  constructor(readonly data: ShapeToInterface<typeof CHUNK_FORMAT_SHAPE>) {
    const sectionsData = this.data?.['sections'] ?? this.data?.['Level']?.['Sections'] ?? [];
    this.sections = sectionsData.map(section => {
      const result = new ChunkSection(this.dataVersion, section);
      this.sectionsByY[result.y] = result;
      return result;
    });
  }

  readonly sections: ChunkSection[];
  readonly sectionsByY: { [key: number]: ChunkSection } = {};

  get dataVersion() {
    return this.data['DataVersion'];
  }

  get xPos() {
    return this.data['xPos'] ?? this.data['Level']?.['xPos'];
  }

  get zPos() {
    return this.data['zPos'] ?? this.data['Level']?.['zPos'];
  }

  getHeightMap(map: HeightMap, x: number, z: number) {
    const heightMap = this.data['Heightmaps']?.[map] ?? this.data['Level']?.['Heightmaps']?.[map];
    if (heightMap) {
      const blockIndex = x + z * 16;
      return readLongPackedArray(heightMap, 9, blockIndex, this.dataVersion < DataVersions.SNAPSHOT_20w17a);
    }
    return 0;
  }

  getBlockState(x: number, y: number, z: number): string {
    const sectionIndex = Math.floor(y / 16);
    const section = this.sectionsByY[sectionIndex];
    if (section) {
      return section.getBlockState(x, y, z);
    }
    return 'minecraft:air';
  }
}

class ChunkSection {
  constructor(readonly dataVersion: number, section: Section) {
    const paletteEntries = section['block_states']?.['palette']
      ?? section['Palette']
      ?? [{ 'Name': 'minecraft:air', 'Properties': {} }];
    this.palette = paletteEntries.map(blockState);
    this.y = section['Y'] ?? 0;
    this.blockStates = section['block_states']?.['data'] ?? section['BlockStates'];
    this.bitsPerBlock = Math.max(Math.ceil(Math.log2(this.palette.length)), 4);
  }

  palette: string[];
  y: number;
  blockStates: DataView | undefined;
  bitsPerBlock: number;

  getBlockState(x: number, y: number, z: number): string {
    const blockStates = this.blockStates;
    if (blockStates) {
      x = x & 0xF;
      y = y & 0xF;
      z = z & 0xF;
      const blockIndex = x + z * 16 + y * 256;
      return this.palette[readLongPackedArray(blockStates, this.bitsPerBlock, blockIndex, this.dataVersion < DataVersions.SNAPSHOT_20w17a)];
    }
    return 'minecraft:air';
  }
}
