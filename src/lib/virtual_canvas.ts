import { p, parseP, Point } from './point';

const SEGMENT_SIZE = 16;

function isPowerOfTwo(x: number) {
  return ((x !== 0) && !(x & (x - 1)));
}

/**
 * A sparse representation of an infinite 3d array of ints. Uses
 * 16^3 subchunks as the smallest unit of storage. Supports values
 * up to 16 bits.
 */
export class Virtual3DCanvas {
  constructor(
    readonly xSize = SEGMENT_SIZE,
    readonly ySize = SEGMENT_SIZE,
    readonly zSize = SEGMENT_SIZE,
  ) {
    if (!isPowerOfTwo(xSize)) {
      throw new Error("xSize must be a power of two.");
    }
    if (!isPowerOfTwo(ySize)) {
      throw new Error("ySize must be a power of two.");
    }
    if (!isPowerOfTwo(zSize)) {
      throw new Error("zSize must be a power of two.");
    }
  }

  private segments: { [segment: Point]: Uint16Array | Uint8Array } = {};

  // if true, then some value in the canvas required more than 8 bits.
  requires16bits = false;
  empty = true;
  minx = 0;
  maxx = 0;
  miny = 0;
  maxy = 0;
  minz = 0;
  maxz = 0;

  get width() {
    return this.maxx - this.minx + 1;
  }

  get height() {
    return this.maxy - this.miny + 1;
  }

  get length() {
    return this.maxz - this.minz + 1;
  }

  get(x: number, y: number, z: number): number {
    const sx = Math.floor(x / this.xSize);
    const sy = Math.floor(y / this.ySize);
    const sz = Math.floor(z / this.zSize);
    x = x & (this.xSize - 1);
    y = y & (this.ySize - 1);
    z = z & (this.zSize - 1);

    const segmentPoint = p(sx, sy, sz);
    if (this.segments[segmentPoint] == null) {
      return 0;
    }

    return this.segments[segmentPoint][x + this.xSize * (z + this.zSize * y)];
  }

  set(x: number, y: number, z: number, value: number) {
    if (value > 0xFF) {
      this.requires16bits = true;
    }

    // Recalculate the extents
    if (this.empty) {
      this.maxx = this.minx = x;
      this.maxy = this.miny = y;
      this.maxz = this.minz = z;
      this.empty = false;
    } else {
      this.maxx = Math.max(this.maxx, x);
      this.maxy = Math.max(this.maxy, y);
      this.maxz = Math.max(this.maxz, z);
      this.minx = Math.min(this.minx, x);
      this.miny = Math.min(this.miny, y);
      this.minz = Math.min(this.minz, z);
    }

    const sx = Math.floor(x / this.xSize);
    const sy = Math.floor(y / this.ySize);
    const sz = Math.floor(z / this.zSize);

    x = x & (this.xSize - 1);
    y = y & (this.ySize - 1);
    z = z & (this.zSize - 1);

    const segmentPoint = p(sx, sy, sz);
    if (this.segments[segmentPoint] == null) {
      // create a new segment if needed
      this.segments[segmentPoint] = value > 0xFF
        ? new Uint16Array(this.xSize * this.ySize * this.zSize)
        : new Uint8Array(this.xSize * this.ySize * this.zSize);
    } else if (value > 0xFF && this.segments[segmentPoint] instanceof Uint8Array) {
      // move the data to a 16bit segment if needed
      this.segments[segmentPoint] = Uint16Array.from(this.segments[segmentPoint]);
    }

    this.segments[segmentPoint][x + this.xSize * (z + this.zSize * y)] = value;
  }

  getAllBlocks(): [array: Uint16Array | Uint8Array, nonZero: number] {
    const width = this.width;
    const height = this.height;
    const length = this.length;

    const result = this.requires16bits
      ? new Uint16Array(width * height * length)
      : new Uint8Array(width * height * length);

    // If we haven't written any blocks, return a single empty block.
    if (this.empty) { return [result, 0]; }

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

  [Symbol.iterator]() {
    const entries = Object.entries(this.segments);
    return entries.map<[number, number, number, Uint8Array | Uint16Array]>(([p, data]) => {
      const [x, y, z] = parseP(p as Point);
      return [x * this.xSize, y * this.ySize, z * this.zSize, data];
    })[Symbol.iterator]();
  }
}

/**
 * A 3D set.
 */
export class Virtual3DSet {
  canvas: Virtual3DCanvas;

  constructor(
    readonly xSize = SEGMENT_SIZE,
    readonly ySize = SEGMENT_SIZE,
    readonly zSize = SEGMENT_SIZE
  ) {
    this.canvas = new Virtual3DCanvas(xSize, ySize, zSize);
  }

  add(x: number, y: number, z: number) {
    const yByte = Math.floor(y / 8);
    let current = this.canvas.get(x, yByte, z);
    current |= (1 << (y & 7));
    this.canvas.set(x, yByte, z, current);
  }

  has(x: number, y: number, z: number) {
    const yByte = Math.floor(y / 8);
    const current = this.canvas.get(x, yByte, z);
    return ((current >>> (y & 7)) & 1) === 1;
  }

  getColumn(x: number, y: number, z: number): number {
    return this.canvas.get(x, Math.floor(y / 8), z);
  }

  readData(data: Uint8Array | Uint16Array, x: number, y: number, z: number): number {
    return data[x + this.xSize * (z + this.zSize * y)];
  }

  [Symbol.iterator](): Iterator<[number, number, number, Uint8Array | Uint16Array]> {
    return this.canvas[Symbol.iterator]();
  }
}

export class Virtual2DSet {
  readonly xSize = SEGMENT_SIZE;
  readonly zSize = SEGMENT_SIZE;
  readonly segments: Record<Point, Uint8Array> = {};

  add(x: number, z: number) {
    let xByte = Math.floor(x / 8);
    const sx = Math.floor(xByte / this.xSize);
    const sz = Math.floor(z / this.zSize);
    xByte = xByte & (this.xSize - 1);
    z = z & (this.zSize - 1);

    const segmentPoint = p(sx, 0, sz);
    if (this.segments[segmentPoint] == null) {
      this.segments[segmentPoint] = new Uint8Array(this.xSize * this.zSize);
    }

    const index = xByte + z * this.xSize;
    let current = this.segments[segmentPoint][index];
    current |= (1 << (x & 7));
    this.segments[segmentPoint][index] = current;
  }

  has(x: number, z: number) {
    let xByte = Math.floor(x / 8);
    const sx = Math.floor(xByte / this.xSize);
    const sz = Math.floor(z / this.zSize);
    xByte = xByte & (this.xSize - 1);
    z = z & (this.zSize - 1);

    const segmentPoint = p(sx, 0, sz);
    if (this.segments[segmentPoint] == null) {
      return false;
    }

    const index = xByte + z * this.xSize;
    const current = this.segments[segmentPoint][index];
    return ((current >>> (x & 7)) & 1) === 1;
  }

  readData(data: Uint8Array, x: number, z: number) {
    return data[x + z * this.xSize];
  }

  [Symbol.iterator]() {
    const entries = Object.entries(this.segments);
    return entries.map<[number, number, Uint8Array]>(([p, data]) => {
      const [x, , z] = parseP(p as Point);
      return [x * this.xSize, z * this.zSize, data];
    })[Symbol.iterator]();
  }
}