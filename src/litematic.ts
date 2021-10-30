
import { ShapeToInterface, Nbt } from "./nbt";
import * as pako from 'pako';

export const SCHEMATIC_SHAPE = {
  'Version': 'int',
  'MinecraftDataVersion': 'int',
  'Metadata': {
    'Name': 'string',
    'Author': 'string',
    'Description': 'string',
    'EnclosingSize': { x: 'int', y: 'int', z: 'int' },
    'TimeCreated': 'long',
    'TimeModified': 'long',
    'TotalBlocks': 'int',
    'TotalVolume': 'int',
    'RegionCount': 'int',
  },
  'Regions': {
    '*': {
      'BlockStatePalette': [{
        'Name': 'string',
        'Properties': { '*': 'string' }
      }],
      'BlockStates': 'longArray',
      'Position': { x: 'int', y: 'int', z: 'int' },
      'Size': { x: 'int', y: 'int', z: 'int' },
      'Entities': [{ '*': '*' }],
      'TileEntities': [{ '*': '*' }],
      'PendingBlockTicks': [{ '*': '*' }],
    }
  }
} as const;

const REGION_SHAPE = SCHEMATIC_SHAPE['Regions']['*'];
const BLOCK_STATE_SHAPE = REGION_SHAPE['BlockStatePalette'][0];

export type Point = `${number}:${number}:${number}`;

/**
 * A string representation of a 3D point, which can be used
 * as a readonly point struct with structural equality,
 * or as an object key.
 */
export function p(x: number, y: number, z: number): Point {
  return `${x}:${y}:${z}`;
}

export function parseP(point: Point): [number, number, number] {
  return point.split(':').map(c => +c) as [number, number, number];
}

/**
 * Converts the Nbt form of a block state palette entry into
 * a string like "minecraft:observer[facing=east]".
 */
export function blockState(state: ShapeToInterface<typeof BLOCK_STATE_SHAPE>): string {
  if (state['Properties'] && Object.keys(state['Properties']).length) {
    return `${state['Name']}[${Object.keys(state['Properties'])
      .sort()
      .map(prop => `${prop}=${state['Properties'][prop]}`)
      .join(',')}]`;
  }
  return `${state['Name']}`;
}

/**
 * Parses a string like "minecraft:observer[facing=east]" to
 * {Name: "minecraft:observer", Properties: {facing: "east"}}.
 */
export function parseBlockState(state: string): ShapeToInterface<typeof BLOCK_STATE_SHAPE> {
  let [name, props] = state.split('[');
  const properties: Record<string, string> = {};
  if (props) {
    for (const kv of props.slice(0, -1).split(',')) {
      const [key, value] = kv.split('=');
      properties[key] = value;
    }
  }

  return {
    'Name': name,
    'Properties': properties
  };
}

/**
 * Returns the number of bits needed to represent all of the block states
 * in nPaletteEntries. There is always a minimum of 2 bits.
 */
function bitsForBlockStates(nPaletteEntries: number): number {
  return Math.max(Math.ceil(Math.log2(nPaletteEntries)), 2);
}

/**
 * Reads the first region from a schematic.
 */
export class SchematicReader {
  readonly nbt = new Nbt(SCHEMATIC_SHAPE);
  readonly nbtData: ShapeToInterface<typeof SCHEMATIC_SHAPE>;
  readonly regionName: string;
  readonly palette: readonly string[];
  readonly blocks: Uint16Array;
  readonly width: number;
  readonly height: number;
  readonly length: number;

  constructor(fileContents: ArrayBuffer) {
    const unzipped = pako.ungzip(new Uint8Array(fileContents));
    this.nbtData = this.nbt.parse(unzipped);
    const regions = Object.keys(this.nbtData['Regions']);
    if (regions.length !== 1) {
      console.warn('SchematicReader only supports a single region for now.');
    }

    this.regionName = regions[0];
    const region = this.nbtData['Regions'][this.regionName];
    this.palette = region['BlockStatePalette'].map(blockState);
    const bits = BigInt(bitsForBlockStates(this.palette.length));
    const mask = (1n << bits) - 1n;
    const width = this.width = Math.abs(region['Size']['x']);
    const height = this.height = Math.abs(region['Size']['y']);
    const length = this.length = Math.abs(region['Size']['z']);
    this.blocks = new Uint16Array(width * height * length);
    let offsetBits = 0n;

    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const offsetBigInt = (offsetBits / 64n);
          const offsetBigIntByte = Number(offsetBigInt * 8n);
          const currentBigInt = region['BlockStates'].getBigUint64(offsetBigIntByte);
          const nextBigInt = (offsetBigIntByte + 8 < region['BlockStates'].byteLength)
            ? region['BlockStates'].getBigUint64(offsetBigIntByte + 8)
            : 0n;
          const combined = (nextBigInt << 64n) + currentBigInt;
          const blockState = Number((combined >> (offsetBits % 64n)) & mask);
          this.blocks[x + width * (z + length * y)] = blockState;
          offsetBits += bits;
        }
      }
    }
  }

  getBlock(x: number, y: number, z: number): string {
    const index = x + this.width * (z + this.length * y);
    return this.palette[this.blocks[index]];
  }

  get version() {
    return this.nbtData['Version'];
  }

  get minecraftDataVersion() {
    return this.nbtData['MinecraftDataVersion'];
  }

  get name() {
    return this.nbtData['Metadata']['Name'];
  }

  get author() {
    return this.nbtData['Metadata']['Author'];
  }

  get description() {
    return this.nbtData['Metadata']['Description'];
  }

  get totalBlocks() {
    return this.nbtData['Metadata']['TotalBlocks'];
  }

  get totalVolume() {
    return this.nbtData['Metadata']['TotalVolume'];
  }

  get enclosingSize() {
    return this.nbtData['Metadata']['EnclosingSize'];
  }

  get timeCreated() {
    return this.nbtData['Metadata']['TimeCreated'];
  }

  get timeModified() {
    return this.nbtData['Metadata']['TimeModified'];
  }

  get regionPosition() {
    return this.nbtData['Regions'][this.regionName]['Position'];
  }
}

/**
 * Simple interface for writing schematics with a
 * single region. Uses a virtual infinite space for
 * setting blocks, and then uses the smallest bounding box
 * when saving.
 */
export class SchematicWriter {
  nbt = new Nbt(SCHEMATIC_SHAPE);
  description = '';
  palette: { [blockState: string]: number } = { 'minecraft:air': 0 };
  paletteList = ['minecraft:air'];
  canvas = new Virtual3DCanvas();
  version = 5;
  minecraftDataVersion = 2730;

  constructor(public name: string, public author: string) {
  }

  /**
   * Gets the index of the given block state in the palette,
   * adding it to the palette if necessary.
   */
  getOrCreatePaletteIndex(blockState: string) {
    if (this.palette[blockState] !== undefined) {
      return this.palette[blockState];
    }
    this.paletteList.push(blockState);
    this.palette[blockState] = this.paletteList.length - 1;
    return this.palette[blockState];
  }

  /**
   * Sets the block (x, y, z) to the given block state.
   */
  setBlock(x: number, y: number, z: number, blockState: string) {
    this.canvas.set(x, y, z, this.getOrCreatePaletteIndex(blockState));
  }

  /**
   * Gets the block state at (x, y, z)
   */
  getBlock(x: number, y: number, z: number): string {
    return this.paletteList[this.canvas.get(x, y, z)];
  }

  asNbtData(): ShapeToInterface<typeof SCHEMATIC_SHAPE> {
    const [blocks, nonAirBlocks] = this.canvas.getAllBlocks();
    const extents = this.canvas.extents;
    const bits = bitsForBlockStates(this.paletteList.length);
    const uint64sRequired = Math.ceil(blocks.length * bits / 64);
    const blockStates = new DataView(new ArrayBuffer(uint64sRequired * 8));

    // Pack the blocks into the blockStates array using
    // only the number of bits required for each entry.
    let current = 0n;
    let next = 0n;
    let bitOffset = 0;
    let blockStatesIndex = 0;
    for (const block of blocks) {
      const shifted = BigInt(block) << BigInt(bitOffset);
      current |= shifted;
      next |= shifted >> 64n;
      bitOffset += bits;

      if (bitOffset >= 64) {
        bitOffset -= 64;
        blockStates.setBigUint64(blockStatesIndex, current);
        blockStatesIndex += 8;
        current = next;
        next = 0n;
      }
    }

    const now = BigInt(Date.now());

    return {
      'Version': this.version,
      'MinecraftDataVersion': this.minecraftDataVersion,
      'Metadata': {
        'Name': this.name,
        'Author': this.author,
        'Description': this.description,
        'TimeCreated': now,
        'TimeModified': now,
        'TotalBlocks': nonAirBlocks,
        'TotalVolume': this.canvas.width * this.canvas.height * this.canvas.length,
        'RegionCount': 1,
        'EnclosingSize': {
          'x': this.canvas.width,
          'y': this.canvas.height,
          'z': this.canvas.length
        }
      },
      'Regions': {
        [this.name]: {
          'BlockStatePalette': this.paletteList.map(parseBlockState),
          'BlockStates': blockStates,
          'Position': {
            'x': extents.minx,
            'y': extents.miny,
            'z': extents.minz
          },
          'Size': {
            'x': this.canvas.width,
            'y': this.canvas.height,
            'z': this.canvas.length
          },
          'Entities': [],
          'PendingBlockTicks': [],
          'TileEntities': [],
        }
      }
    };
  }

  save(): Uint8Array {
    const uncompressed = this.nbt.serialize(this.asNbtData());
    return pako.gzip(uncompressed);
  }
}

const SEGMENT_SIZE = 16;

/**
 * A sparse representation of an infinite 3d array of uint16. Uses
 * 16^3 subchunks as the smallest unit of storage.
 */
class Virtual3DCanvas {
  private segments: { [segment: string]: Uint16Array } = {};
  private minx = 1e100;
  private maxx = -1e100;
  private miny = 1e100;
  private maxy = -1e100;
  private minz = 1e100;
  private maxz = -1e100;

  get extents() {
    if (this.minx === 1e100) {
      return {
        minx: 0, maxx: 0, miny: 0, maxy: 0, minz: 0, maxz: 0
      };
    }
    return {
      minx: this.minx,
      maxx: this.maxx,
      miny: this.miny,
      maxy: this.maxy,
      minz: this.minz,
      maxz: this.maxz,
    }
  }

  get width() {
    if (this.minx === 1e100) {
      return 1;
    }
    return this.maxx - this.minx + 1;
  }

  get height() {
    if (this.miny === 1e100) {
      return 1;
    }
    return this.maxy - this.miny + 1;
  }

  get length() {
    if (this.minz === 1e100) {
      return 1;
    }
    return this.maxz - this.minz + 1;
  }

  get(x: number, y: number, z: number): number {
    const sx = Math.floor(x / SEGMENT_SIZE);
    const sy = Math.floor(y / SEGMENT_SIZE);
    const sz = Math.floor(z / SEGMENT_SIZE);
    x = ((x % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;
    y = ((y % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;
    z = ((z % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;

    const segmentPoint = p(sx, sy, sz);
    if (!this.segments[segmentPoint]) {
      return 0;
    }

    return this.segments[segmentPoint][x + SEGMENT_SIZE * (z + SEGMENT_SIZE * y)];
  }

  set(x: number, y: number, z: number, value: number) {
    // Recalculate the extents
    this.maxx = Math.max(this.maxx, x);
    this.maxy = Math.max(this.maxy, y);
    this.maxz = Math.max(this.maxz, z);
    this.minx = Math.min(this.minx, x);
    this.miny = Math.min(this.miny, y);
    this.minz = Math.min(this.minz, z);

    const sx = Math.floor(x / SEGMENT_SIZE);
    const sy = Math.floor(y / SEGMENT_SIZE);
    const sz = Math.floor(z / SEGMENT_SIZE);

    // Calculate the true modulo for the coordinates
    // within the subchunk (% with a negative returns
    // a negative)
    x = ((x % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;
    y = ((y % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;
    z = ((z % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;

    const segmentPoint = p(sx, sy, sz);
    if (!this.segments[segmentPoint]) {
      this.segments[segmentPoint] = new Uint16Array(SEGMENT_SIZE * SEGMENT_SIZE * SEGMENT_SIZE);
    }
    this.segments[segmentPoint][x + SEGMENT_SIZE * (z + SEGMENT_SIZE * y)] = value;
  }

  getAllBlocks(): [array: Uint16Array, nonZero: number] {
    const width = this.width;
    const height = this.height;
    const length = this.length;

    const result = new Uint16Array(width * height * length);

    // If we haven't written any blocks, return a single empty block.
    if (this.minx === 1e100) { return [result, 0]; }

    // TODO: this could be more efficient if we only process
    // chunks that exist.
    let nonZero = 0;
    for (let y = 0, index = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++, index++) {
          const block = this.get(this.minx + x, this.miny + y, this.minz + z);
          if (block !== 0) { nonZero++; }
          result[index] = block;
        }
      }
    }

    return [result, nonZero];
  }
}

export class IntRange implements IterableIterator<number> {
  constructor(private start: number, private end: number, private readonly step = 1) {
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.step > 0 && this.start < this.end || this.step < 0 && this.start > this.end) {
      const result = { value: this.start, done: false } as const;
      this.start += this.step;
      return result;
    } else {
      return { value: undefined, done: true } as const;
    }
  }

  expand(n: number) {
    return new IntRange(this.start - n, this.end + n, this.step);
  }

  reverse() {
    return new IntRange(this.end - 1, this.start - 1, -this.step);
  }
}