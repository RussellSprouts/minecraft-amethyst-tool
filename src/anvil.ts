import { decompress } from './compression';
import { blockState } from './litematic';
import { expandLongPackedArray, readLongPackedArray } from './long_packed_array';
import { Nbt, ShapeToInterface } from './nbt';
import { p } from './point';

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
 * A collection of Region files.
 */
export class RegionCollection {
  filesByName = new Map<string, File>();

  constructor(public readonly files: Iterable<File>) {
    for (const file of files) {
      this.filesByName.set(file.name, file);
    }
  }

  async getBlockState(x: number, y: number, z: number): Promise<string> {
    const regionX = Math.floor(x / 512);
    const regionZ = Math.floor(z / 512);
    console.log('REGION:', regionX, regionZ);
    const region = this.filesByName.get(`r.${regionX}.${regionZ}.mca`);

    if (region) {
      const parser = new AnvilParser(new DataView(await region.arrayBuffer()));
      const chunkX = (Math.floor(x / 16) % 32 + 32) % 32;
      const chunkZ = (Math.floor(z / 16) % 32 + 32) % 32;
      console.log('CHUNK:', chunkX, chunkZ);
      const chunk = await parser.parseChunk(chunkX, chunkZ);
      if (chunk) {
        return chunk.getBlockState(x, y, z);
      }
    }

    return 'minecraft:air';
  }
}

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
  async countBlocks(state: string): Promise<Set<string>> {
    if (this.input.byteLength === 0) {
      return new Set();
    }

    const result = new Set<string>();
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        const startIndex = this.chunkOffset(x, z);
        if (startIndex < 0) { continue; }
        const dataLength = this.input.getUint32(startIndex);
        const compressionType = this.input.getUint8(startIndex + 4);
        const compressedData = new Uint8Array(this.input.buffer, startIndex + 5, dataLength - 1);
        const uncompressed = await decompress(compressedData);
        const nbtParser = new Nbt(CHUNK_FORMAT_SHAPE);
        const data = nbtParser.parse(uncompressed);
        const chunk = new ChunkData(data);
        for (const section of chunk.sections) {
          if (section.palette.indexOf(state) !== -1) {
            for (let y = 0; y < 16; y++) {
              for (let z = 0; z < 16; z++) {
                for (let x = 0; x < 16; x++) {
                  if (section.getBlockState(x, y, z) === state) {
                    result.add(p(chunk.xPos * 16 + x, section.y * 16 + y, chunk.zPos * 16 + z));
                  }
                }
              }
            }
          }
        }
      }
    }
    return result;
  }

  async parseChunk(x: number, z: number): Promise<ChunkData | undefined> {
    const index = `${x}:${z}`;
    if (this.parsedChunks[index]) {
      return this.parsedChunks[index];
    }

    const startIndex = this.chunkOffset(x, z);
    if (startIndex !== -1) {
      const dataLength = this.input.getUint32(startIndex);
      const compressionType = this.input.getUint8(startIndex + 4);
      const compressedData = new Uint8Array(this.input.buffer, startIndex + 5, dataLength - 1);
      const uncompressed = await decompress(compressedData);
      const nbtParser = new Nbt(CHUNK_FORMAT_SHAPE);

      const data = nbtParser.parse(uncompressed);
      const chunk = new ChunkData(data);
      this.parsedChunks[index] = chunk;
      return chunk;
    }

    return undefined;
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
    this.packedBlockStates = section['block_states']?.['data'] ?? section['BlockStates'];
    this.bitsPerBlock = Math.max(Math.ceil(Math.log2(this.palette.length)), 4);
  }

  palette: string[];
  y: number;
  packedBlockStates: DataView | undefined;
  blockStates: Uint16Array | Uint8Array | undefined;
  bitsPerBlock: number;

  getBlockState(x: number, y: number, z: number): string {
    if (!this.blockStates && this.packedBlockStates) {
      this.blockStates = expandLongPackedArray(this.packedBlockStates, this.bitsPerBlock, 16 * 16 * 16, this.dataVersion < DataVersions.SNAPSHOT_20w17a);
    }

    if (this.blockStates) {
      x = x & 0xF;
      y = y & 0xF;
      z = z & 0xF;
      const blockIndex = x + z * 16 + y * 256;
      return this.palette[this.blockStates[blockIndex]];
    }
    return 'minecraft:air';
  }
}
