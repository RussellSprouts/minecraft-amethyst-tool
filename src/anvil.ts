import * as pako from 'pako';
import { Nbt } from './nbt';

enum DataVersions {
  RELEASE_1_18 = 2860,
  SNAPSHOT_20w17a = 2529
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

  parseChunk(x: number, z: number, allBlocks: Set<string>) {
    const index = `${x}:${z}`;
    if (this.parsedChunks[index]) {
      return this.parsedChunks[index];
    }

    const startIndex = this.chunkOffset(x, z);
    if (startIndex !== -1) {
      const dataLength = this.input.getUint32(startIndex);
      // console.log('LENGTH', dataLength, startIndex);
      const compressionType = this.input.getUint8(startIndex + 4);
      // console.log('COMPRESSION', compressionType);
      // console.log(this);
      const compressedData = new Uint8Array(this.input.buffer, startIndex + 5, dataLength - 1);
      // console.log('COMPRESSED', compressedData)
      const uncompressed = pako.ungzip(compressedData);
      // console.log('UNCOMPRESSED', uncompressed);
      const basicNbtParser = new Nbt('*');
      const CHUNK_FORMAT_SHAPE = {
        'DataVersion': 'int',
        /** Level data for 1.18+ */
        'sections': [{
          'block_states': {
            'data': 'longArray',
            'palette': [{
              'Name': 'string',
              'Properties': { '*': 'string' }
            }],
            // 'SkyLight': '*',
            'Y': 'byte',
            // 'biomes': '*',
          }
        }],
        /** Level data for pre-1.18 */
        'Level': {
          'xPos': 'int',
          'zPos': 'int',
          'Status': 'string',
          // 'Biomes': 'intArray',
          'Sections': [{
            // 'BlockLight': '*',
            'BlockStates': 'longArray',
            'Palette': [{
              'Name': 'string',
              'Properties': { '*': 'string' },
            }],
            // 'SkyLight': 'byteArray',
            'Y': 'byte',
          }],
          // 'TileEntities': '*',
          // 'CarvingMasks': '*',
          // 'Heightmaps': '*',
          // 'LastUpdate': 'long',
          // 'Lights': '*',
          // 'Entities': '*',
          // 'LiquidsToBeTicked': '*',
          // 'LiquidTicks': '*',
          // 'InhabitedTime': 'long',
          // 'PostProcessing': '*',
          // 'TileTicks': '*',
          // 'ToBeTicked': '*',
          // 'Structures': '*',
        },
      } as const;
      const nbtParser = new Nbt(CHUNK_FORMAT_SHAPE);

      console.log('Unshaped-data', basicNbtParser.parse(uncompressed));
      const data = nbtParser.parse(uncompressed);
      console.log(data);
      const version = data['DataVersion'];
      if (version >= DataVersions.RELEASE_1_18) {
        // 1.18+
        for (const section of data?.['sections'] ?? []) {
          for (const blockState of section?.['block_states']?.['palette'] ?? []) {
            allBlocks.add(blockState['Name']);
          }
        }
      } else {
        for (const section of data?.['Level']?.['Sections'] ?? []) {
          for (const blockState of section['Palette'] || []) {
            allBlocks.add(blockState['Name']);
          }
        }
      }
    }
  }
}