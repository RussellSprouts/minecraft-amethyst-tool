import { p } from './point';

const SEGMENT_SIZE = 16;

/**
 * A sparse representation of an infinite 3d array of ints. Uses
 * 16^3 subchunks as the smallest unit of storage. Supports values
 * up to 16 bits.
 */
export class Virtual3DCanvas {
  private segments: { [segment: string]: Uint16Array | Uint8Array } = {};

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
    const sx = Math.floor(x / SEGMENT_SIZE);
    const sy = Math.floor(y / SEGMENT_SIZE);
    const sz = Math.floor(z / SEGMENT_SIZE);
    x = ((x % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;
    y = ((y % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;
    z = ((z % SEGMENT_SIZE) + SEGMENT_SIZE) % SEGMENT_SIZE;

    const segmentPoint = p(sx, sy, sz);
    if (this.segments[segmentPoint] == null) {
      return 0;
    }

    return this.segments[segmentPoint][x + SEGMENT_SIZE * (z + SEGMENT_SIZE * y)];
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
    if (this.segments[segmentPoint] == null) {
      // create a new segment if needed
      this.segments[segmentPoint] = value > 0xFF
        ? new Uint16Array(SEGMENT_SIZE * SEGMENT_SIZE * SEGMENT_SIZE)
        : new Uint8Array(SEGMENT_SIZE * SEGMENT_SIZE * SEGMENT_SIZE);
    } else if (value > 0xFF && this.segments[segmentPoint] instanceof Uint8Array) {
      // move the data to a 16bit segment if needed
      this.segments[segmentPoint] = Uint16Array.from(this.segments[segmentPoint]);
    }

    this.segments[segmentPoint][x + SEGMENT_SIZE * (z + SEGMENT_SIZE * y)] = value;
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
}
