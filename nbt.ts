import * as pako from 'pako';

/** The possible Nbt tags. */
export const enum Tags {
  End = 0,
  Byte = 1,
  Short = 2,
  Int = 3,
  Long = 4,
  Float = 5,
  Double = 6,
  ByteArray = 7,
  String = 8,
  List = 9,
  Compound = 10,
  IntArray = 11,
  LongArray = 12,
};

/**
 * A description of the shape of an Nbt file.
 * Used for parsing validation and as a guide for serialization.
 */
export type NbtShape =
  'end' | 'byte' | 'short' | 'int' | 'long' | 'float' | 'double' | 'byteArray' | 'intArray' | 'longArray' | 'string'
  // Allow anything -- for reading arbitrary nbt data, can't be written back.
  | '*'
  // A List containing elements of the containing type.
  | readonly [NbtShape]
  // A compound with arbitrary keys of the given type.
  | { readonly '*': NbtShape }
  // A compound with the given keys with the given types.
  | { readonly [key: string]: NbtShape };

/** Maps simple shape names to their JS representation */
export interface SimpleShapeToInterface {
  end: never;
  byte: number;
  short: number;
  int: number;
  long: bigint;
  float: number;
  double: number;
  // Have to use DataView for these because the data is big-endian.
  byteArray: DataView;
  intArray: DataView;
  longArray: DataView;
  string: string;
  '*': unknown;
}

/**
 * Given a shape T, gives the type of the parsed
 * result of an Nbt value of that shape.
 */
export type ShapeToInterface<T> =
  T extends keyof SimpleShapeToInterface ? SimpleShapeToInterface[T] :
  T extends readonly [infer V] ? Array<ShapeToInterface<V>> :
  T extends ReadonlyArray<infer V> ? Array<ShapeToInterface<V>> :
  T extends { readonly '*': infer V } ? { [key: string]: ShapeToInterface<V> } :
  { [K in keyof T]: ShapeToInterface<T[K]> };

/**
 * Given an object or array shape and a prop, gives the shape of the prop.
 */
function shapeGet(shape: { '*': NbtShape } | { [key: string]: NbtShape } | '*' | [NbtShape], prop: string | 0): NbtShape {
  if (shape === '*') {
    return '*';
  } else if (Array.isArray(shape)) {
    return shape[0];
  } else if (shape['*']) {
    return shape['*'];
  } else {
    return (shape as any)[prop] ?? '*';
  }
}

function assert(a: boolean, message: string, path?: string): asserts a is true {
  if (!a) {
    throw new Error(`${message}\n${path}`);
  }
}

function checkExhaustive(a: never): never {
  throw new Error(`Unexpected case: ${a}`);
}

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

/**
 * Parses utf8 encoded text to a JS string
 * 
 * @param array The data to decode
 * @param i The start index
 * @param length The length
 * @returns a JS string
 */
function decodeUtf8(array: DataView, i: number, length: number): string {
  if (length === 0) { return ''; }
  return decoder.decode(new DataView(array.buffer, i, length));
}

/**
 * Encodes the given string as utf8.
 * 
 * @param s The string
 * @returns The utf8 encoding as a Uint8Array
 */
function encodeUtf8(s: string): Uint8Array {
  return encoder.encode(s);
}

/**
 * Streams data to a DataView.
 * Each writer method moves the cursor forward,
 * and resizing is automatic.
 */
class DataViewWriter {
  i = 0;
  data: DataView;
  constructor(initialCapacity: number = 1024) {
    this.data = new DataView(new ArrayBuffer(initialCapacity));
  }

  byte(n: number) {
    this.assertCapacity(1);
    this.data.setInt8(this.i, n);
    this.i++;
  }

  short(n: number) {
    this.assertCapacity(2);
    this.data.setInt16(this.i, n);
    this.i += 2;
  }

  int(n: number) {
    this.assertCapacity(4);
    this.data.setInt32(this.i, n);
    this.i += 4;
  }

  long(n: bigint) {
    this.assertCapacity(8);
    this.data.setBigInt64(this.i, n);
    this.i += 8;
  }

  float(n: number) {
    this.assertCapacity(4);
    this.data.setFloat32(this.i, n);
    this.i += 4;
  }

  double(n: number) {
    this.assertCapacity(8);
    this.data.setFloat64(this.i, n);
    this.i += 8;
  }

  string(s: string) {
    const encoded = encodeUtf8(s);
    this.assertCapacity(encoded.byteLength + 2);
    this.data.setUint16(this.i, encoded.byteLength);
    this.i += 2;
    for (let i = 0; i < encoded.byteLength; i++) {
      this.data.setUint8(this.i + i, encoded[i]);
    }
    this.i += encoded.byteLength;
  }

  array(array: DataView, width: number) {
    const nItems = Math.floor(array.byteLength / width);
    this.assertCapacity(array.byteLength + 4);
    this.data.setInt32(this.i, nItems);
    this.i += 4;
    // we can just copy byte-by-byte, since both buffers
    // are big-endian.
    for (let i = 0; i < array.byteLength; i++) {
      this.data.setUint8(this.i + i, array.getUint8(i));
    }
    this.i += array.byteLength;
  }

  final(): DataView {
    return new DataView(this.data.buffer, 0, this.i);
  }

  /**
   * Assures that the internal buffer can hold newBytes extra
   * bytes, doubling the current buffer size as necessary.
   * @param newBytes The number of new bytes to add
   */
  private assertCapacity(newBytes: number) {
    if (this.i + newBytes > this.data.byteLength) {
      let newSize = this.data.byteLength * 2;
      while (this.i + newBytes > newSize) {
        newSize *= 2;
      }
      const newData = new DataView(new ArrayBuffer(newSize));
      for (let i = 0; i < this.data.byteLength; i++) {
        newData.setInt8(i, this.data.getInt8(i));
      }
      this.data = newData;
    }
  }
}

/**
 * Streams data from a DataView.
 * Each accessor method moves the cursor forward,
 * consuming the data.
 */
class DataViewReader {
  i = 0;
  constructor(readonly data: DataView) {
  }

  byte(): number {
    this.i += 1;
    return this.data.getInt8(this.i - 1);
  }

  short(): number {
    this.i += 2;
    return this.data.getInt16(this.i - 2);
  }

  int(): number {
    this.i += 4;
    return this.data.getInt32(this.i - 4);
  }

  long(): bigint {
    this.i += 8;
    return this.data.getBigInt64(this.i - 8);
  }

  string(): string {
    const length = this.data.getUint16(this.i);
    this.i += 2;
    const string = decodeUtf8(this.data, this.i, length);
    this.i += length;
    return string;
  }

  float(): number {
    this.i += 4;
    return this.data.getFloat32(this.i - 4);
  }

  double(): number {
    this.i += 8;
    return this.data.getFloat64(this.i - 8);
  }

  array(width: number): DataView {
    const length = this.int();
    const result = new DataView(this.data.buffer, this.i, length * width);
    this.i += result.byteLength;
    return result;
  }
}

/**
 * A Nbt parser and serializer for a given shape.
 * Keeping the shape separate from the data allows
 * the parse result to be a plain JS object without
 * extra metadata on the object types.
 * For example, byte and short are both numbers when read,
 * but must be written differently.
 */
export class Nbt<S extends { [key: string]: NbtShape }> {
  constructor(private shape: S) { }

  /**
   * Parses the data in the Uint8Array into the JS object
   * given by the shape of this Nbt parser.
   */
  parse(data: Uint8Array): ShapeToInterface<S> {
    const asView = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const reader = new DataViewReader(asView);
    return this.parseRoot(reader, this.shape) as unknown as ShapeToInterface<S>;
  }

  /**
   * Serializes the JS object into a Uint8Array given
   * by the shape of this Nbt serializer.
   */
  serialize(value: ShapeToInterface<S>): Uint8Array {
    const dataView = this.serializeRoot(value, this.shape);
    return new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
  }

  private parseRoot(data: DataViewReader, shape: NbtShape) {
    assert(data.byte() === Tags.Compound, 'Expected a compound at root');
    assert(data.string() === '', 'Expected an empty name at root');
    return this.parsePayload(data, Tags.Compound, shape, 'root');
  }

  private parsePayload(data: DataViewReader, tagType: Tags, shape: NbtShape, path: string): unknown {
    switch (tagType) {
      case Tags.End:
        return undefined;
      case Tags.Byte:
        this.assertSimpleShape(shape, 'byte', path);
        return data.byte();
      case Tags.Short:
        this.assertSimpleShape(shape, 'short', path);
        return data.short();
      case Tags.Int:
        this.assertSimpleShape(shape, 'int', path);
        return data.int();
      case Tags.Long:
        this.assertSimpleShape(shape, 'long', path);
        return data.long();
      case Tags.Float:
        this.assertSimpleShape(shape, 'float', path);
        return data.float();
      case Tags.Double:
        this.assertSimpleShape(shape, 'double', path);
        return data.double();
      case Tags.String:
        this.assertSimpleShape(shape, 'string', path);
        return data.string();
      case Tags.ByteArray:
        this.assertSimpleShape(shape, 'byteArray', path);
        return data.array(1);
      case Tags.IntArray:
        this.assertSimpleShape(shape, 'intArray', path);
        return data.array(4)
      case Tags.LongArray:
        this.assertSimpleShape(shape, 'longArray', path);
        return data.array(8)
      case Tags.Compound: {
        this.assertCompoundShape(shape, path);
        const result: { [key: string]: unknown } = {};
        let tagType: Tags;
        while ((tagType = data.byte()) !== Tags.End) {
          const name = data.string();
          const payload = this.parsePayload(data, tagType, shapeGet(shape, name), `${path}.${name}`);
          if (shape === '*' || shape['*'] || name in shape) {
            result[name] = payload;
          }
        }
        return result;
      }
      case Tags.List: {
        this.assertListShape(shape, path);
        const itemType = data.byte() as Tags;
        const nItems = data.int();
        const result: unknown[] = [];
        for (let i = 0; i < nItems; i++) {
          result.push(this.parsePayload(data, itemType, shapeGet(shape, 0), `${path}[${i}]`));
        }
        return result;
      }
      default:
        checkExhaustive(tagType);
    }
  }

  private assertSimpleShape<T extends NbtShape>(shape: NbtShape, t: T, path: string): asserts shape is T | '*' {
    assert(shape === '*' || shape === t, `Found a ${t}, but expected ${shape}`, path);
  }

  private assertCompoundShape(shape: NbtShape, path: string): asserts shape is { [key: string]: NbtShape } | '*' {
    assert(shape === '*' || !Array.isArray(shape) && typeof shape === 'object', `Found a compound, but expected ${shape}.`, path);
  }

  private assertListShape(shape: NbtShape, path: string): asserts shape is [NbtShape] | '*' {
    assert(shape === '*' || Array.isArray(shape), `Found a list, but expected ${shape}`, path);
  }

  private serializeRoot(value: unknown, shape: NbtShape): DataView {
    const writer = new DataViewWriter();
    this.assertObject(value, 'root');
    writer.byte(Tags.Compound);
    writer.string('');
    this.serializePayload(writer, value, shape, 'root');
    return writer.final();
  }

  private serializePayload(writer: DataViewWriter, value: unknown, shape: NbtShape, path: string) {
    switch (shape) {
      case 'byte':
        return writer.byte(this.assertNumber(value, path));
      case 'short':
        return writer.short(this.assertNumber(value, path));
      case 'int':
        return writer.int(this.assertNumber(value, path));
      case 'long':
        return writer.long(this.assertBigInt(value, path));
      case 'float':
        return writer.float(this.assertNumber(value, path));
      case 'double':
        return writer.double(this.assertNumber(value, path));
      case 'byteArray':
        return writer.array(this.assertDataView(value, path), 1);
      case 'intArray':
        return writer.array(this.assertDataView(value, path), 4);
      case 'longArray':
        return writer.array(this.assertDataView(value, path), 8);
      case 'string':
        return writer.string(this.assertString(value, path));
      case 'end':
        // nothing to write
        return;
      case '*':
        assert(false, `Can't write value of unknown type: ${value}`, path);
        return;
      default:
        if (Array.isArray(shape)) {
          const [itemShape] = shape;
          const array = this.assertArray(value, path);
          writer.byte(this.getTagTypeForShape(itemShape));
          writer.int(array.length);
          let i = 0;
          for (const item of array) {
            this.serializePayload(writer, item, itemShape, `${path}[${i++}]`);
          }
          return;
        } else if (typeof shape === 'object') {
          this.assertCompoundShape(shape, path);
          const obj = this.assertObject(value, path);
          const keys = Object.keys(obj).sort();
          for (const key of keys) {
            const itemShape = shapeGet(shape, key);
            writer.byte(this.getTagTypeForShape(itemShape));
            writer.string(key);
            this.serializePayload(writer, obj[key], itemShape, `${path}.${key}`);
          }
          writer.byte(Tags.End);
          return;
        }
        checkExhaustive(shape);
    }
  }

  private assertNumber(n: unknown, path: string): number {
    assert(typeof n === 'number', `Expected a number, got ${n}`, path);
    return n as number;
  }

  private assertBigInt(n: unknown, path: string): bigint {
    assert(typeof n === 'bigint', `Expected a bigint, got ${n}`, path);
    return n as bigint;
  }

  private assertDataView(n: unknown, path: string): DataView {
    assert(n instanceof DataView, `Expected a DataView, got ${n}`, path);
    return n as DataView;
  }

  private assertString(n: unknown, path: string): string {
    assert(typeof n === 'string', `Expected a string, got ${n}`, path);
    return n as string;
  }

  private assertArray(n: unknown, path: string): unknown[] {
    assert(Array.isArray(n), `Expected an array, got ${n}`, path);
    return n as unknown[];
  }

  private assertObject(n: unknown, path: string): { [key: string]: unknown } {
    assert(typeof n === 'object', `Expected an object, got ${n}`, path);
    return n as { [key: string]: unknown };
  }

  private getTagTypeForShape(shape: NbtShape): Tags {
    switch (shape) {
      case 'byte': return Tags.Byte;
      case 'short': return Tags.Short;
      case 'int': return Tags.Int;
      case 'long': return Tags.Long;
      case 'float': return Tags.Float;
      case 'double': return Tags.Double;
      case 'byteArray': return Tags.ByteArray;
      case 'intArray': return Tags.IntArray;
      case 'longArray': return Tags.LongArray;
      case 'string': return Tags.String;
      case 'end': return Tags.End;
      case '*': return Tags.End; // don't know what to write here.
      default:
        if (Array.isArray(shape)) { return Tags.List; }
        else if (typeof shape === 'object') { return Tags.Compound; }
        checkExhaustive(shape);
    }
  }
}

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

export type Point = `${string}:${string}:${string}`;

/**
 * A string representation of a 3D point, which can be used
 * as a readonly point struct with structural equality,
 * or as an object key.
 */
export function p(x: number, y: number, z: number): Point {
  return `${x}:${y}:${z}`;
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
function parseBlockState(state: string): ShapeToInterface<typeof BLOCK_STATE_SHAPE> {
  let [name, props] = state.split('[');
  const properties: Record<string, string> = {};
  if (props) {
    for (const kv of props.substring(0, -1).split(',')) {
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
 * in nPaletteEntries. It uses a minimum of 2 bits.
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
 * setting blocks, and then finds the smallest bounding box
 * when saving.
 */
export class SchematicWriter {
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
  getPaletteIndex(blockState: string) {
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
    this.canvas.set(x, y, z, this.getPaletteIndex(blockState));
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
}

const SEGMENT_SIZE = 16;

/**
 * A sparse representation of a 3d array of uint16. Stores
 * only the 16^3 segments which have blocks set.
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