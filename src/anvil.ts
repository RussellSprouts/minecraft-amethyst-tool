import * as pako from 'pako';
import { blockState } from './litematic';
import { Nbt, ShapeToInterface } from './nbt';
import { p, Point } from './point';
import { Renderer } from './renderer';
import { Virtual3DCanvas } from './virtual_canvas';

const enum DataVersions {
  // First snapshot that leaves extra bits at the end of blockState arrays
  SNAPSHOT_20w17a = 2529,
  // First snapshot that uses new format for sections in chunk
  SNAPSHOT_21w37a = 2834,
  // First snapshot that uses new format for top-level info
  SNAPSHOT_21w43a = 2844,
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
  private parsedChunks: Record<string, unknown> = {};
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

        let chunkTotal = 0;
        for (const section of chunk.sections) {
          const indexOfTarget = section.palette.indexOf(state);

          if (indexOfTarget !== -1) {
            for (let y = 0; y < 16; y++) {
              for (let z = 0; z < 16; z++) {
                for (let x = 0; x < 16; x++) {
                  const state = section.getPaletteIndex(x, y, z);
                  if (state === indexOfTarget) {
                    chunkTotal++;
                  }
                }
              }
            }
          }
        }
        if (chunkTotal > 0) {
          result[p(data['xPos'], 0, data['zPos'])] = chunkTotal;
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

      // console.log('Unshaped-data', basicNbtParser.parse(uncompressed));
      performance.mark('b');
      performance.measure('unzip', 'a', 'b');
      const data = nbtParser.parse(uncompressed);
      const chunk = new ChunkData(data);
      // console.log(data);

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
              const stateIndex = section.getPaletteIndex(x, y, z);
              const stateString = palette[stateIndex];
              blockCounts.set(stateString, (blockCounts.get(stateString) ?? 0) + 1);
              // renderer.setBlockState(x, startY * 16 + y, z, stateString);
            }
          }
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

const CHUNK_FORMAT_SHAPE = {
  'DataVersion': 'int',
  'xPos': 'int',
  'yPos': 'int',
  'zPos': 'int',

  // 21w43a+
  'sections': [MINECRAFT_SECTION],

  // older versions
  'Level': {
    'xPos': 'int',
    'zPos': 'int',
    'Status': 'string',
    'Sections': [MINECRAFT_SECTION],
  },
} as const;

type Section = ShapeToInterface<typeof MINECRAFT_SECTION>;

class ChunkData {
  constructor(readonly data: ShapeToInterface<typeof CHUNK_FORMAT_SHAPE>) {
    this.sections = this.data?.['sections']?.map(section => new ChunkSection(this.dataVersion, section as Section)) ??
      this.data?.['Level']?.['Sections']?.map(section => new ChunkSection(this.dataVersion, section as Section)) ?? [];
  }

  readonly sections: ChunkSection[];

  get dataVersion() {
    return this.data['DataVersion'];
  }
}

class ChunkSection {
  constructor(readonly dataVersion: number, section: Section) {
    this.palette = (section['block_states']?.['palette']
      ?? section['Palette']
      ?? [{ 'Name': 'minecraft:air', 'Properties': {} }]).map(blockState);
    this.y = section['Y'] ?? 0;
    this.blockStates = section['block_states']?.['data'] ?? section['BlockStates'];
    this.bitsPerBlock = Math.max(Math.ceil(Math.log2(this.palette.length)), 4);
  }

  palette: string[];
  y: number;
  blockStates: DataView | undefined;
  bitsPerBlock: number;

  getPaletteIndex(x: number, y: number, z: number) {
    x = x & 0xF;
    y = y & 0xF;
    z = z & 0xF;
    const blockIndex = x + z * 16 + y * 256;
    const bitMask = (1 << this.bitsPerBlock) - 1;
    // Before 20w17a, blocks could straddle multiple longs. Afterward, the leftover bits are simply unused.
    const unusedBitsPerLong = this.dataVersion < DataVersions.SNAPSHOT_20w17a
      ? 0
      : 64 % this.bitsPerBlock;
    const blocksPerLong = Math.floor(64 / this.bitsPerBlock);
    const bitIndex = blockIndex * this.bitsPerBlock + Math.floor(blockIndex / blocksPerLong) * unusedBitsPerLong;
    const currentLongIndex = Math.floor(bitIndex / 64) * 8;
    const blockStates = this.blockStates;
    if (blockStates) {
      const indexInLong = bitIndex % 64;
      if (indexInLong < 32) {
        const currentLongLo = blockStates.getUint32(currentLongIndex + 4);
        const currentLongHi = blockStates.getUint32(currentLongIndex);
        return ((currentLongLo >>> indexInLong) | (currentLongHi << (31 - indexInLong) << 1)) & bitMask;
      } else {
        const currentLongHi = blockStates.getUint32(currentLongIndex);
        const nextLongLo = currentLongIndex + 8 < blockStates.byteLength ? blockStates.getUint32(currentLongIndex + 12) : 0;
        return ((currentLongHi >>> (indexInLong - 32)) | (nextLongLo << (63 - indexInLong) << 1)) & bitMask;
      }
    }
    return 0;
  }
}