
const ZOOM_BITS = 2;
const ZOOM = 4;
const ZOOM_MASK = 3;

const MIN_BUILD_HEIGHT = -16;
const MAX_BUILD_HEIGHT = 19;


// Parameters for LCG pseudo-random numbers, by Donald Knuth
const MULTIPLIER = 6364136223846793005n;
const INCREMENT = 1442695040888963407n;

export class Int64 {
  readonly hi: number;
  readonly lo: number;

  static fromBigint(i: bigint) {
    i = BigInt.asUintN(64, i);
    return new Int64(Number(i >> 32n), Number(i | 0xFFFFFFFFn));
  }

  static fromNumber(i: number) {
    return new Int64(i < 0 ? 0xFFFFFFFF : 0, i | 0xFFFFFFFF);
  }

  constructor(hi: number, lo: number) {
    this.hi = hi | 0;
    this.lo = lo | 0;
  }

  negate() {
    if (this.equals(INT64_MIN)) {
      return INT64_MIN;
    }
    const lo = (~this.lo) + 1;
    const hi = (~this.hi) + Number(lo > 0xFFFFFFFF);
    return new Int64(hi, lo);
  }

  isNegative() {
    return this.hi & 0x80000000;
  }

  isZero() {
    return this.lo === 0 && this.hi === 0;
  }

  multiply(b: Int64): Int64 {
    if (this.isZero()) {
      return this;
    }
    if (b.isZero()) {
      return b;
    }
    if (this.equals(INT64_MIN)) {
      return (b.lo & 1) ? INT64_MIN : INT64_ZERO;
    }
    if (b.equals(INT64_MIN)) {
      return (this.lo & 1) ? INT64_MIN : INT64_ZERO;
    }

    if (this.isNegative()) {
      if (b.isNegative()) {
        return this.negate().multiply(b.negate());
      } else {
        return this.negate().multiply(b).negate();
      }
    } else if (b.isNegative()) {
      return this.multiply(b.negate()).negate();
    }

    if (this.hi === 0 && b.hi === 0) {
      const product = this.lo * b.lo;
      if (product < Number.MAX_SAFE_INTEGER) {
        return new Int64(Math.floor(product / 0x100000000), product);
      }
    }

    /*
     *     b4    b3    b2    b1 
     * *   a4    a3    a2    a1
     * ------------------------
     *   a1b4  a1b3  a1b2  a1b1
     *   a2b3  a2b2  a2b1     0
     *   a3b2  a3b1     0     0
     * + a4b1     0     0     0
     * ------------------------
     * 
     */

    const a1 = this.lo & 0xFFFF;
    const a2 = this.lo >>> 16;
    const a3 = this.hi & 0xFFFF;
    const a4 = this.hi >>> 16;

    const b1 = b.lo & 0xFFFF;
    const b2 = b.lo >>> 16;
    const b3 = b.hi & 0xFFFF;
    const b4 = b.hi >>> 16;

    let r1 = 0, r2 = 0, r3 = 0, r4 = 0;

    r1 += a1 * b1;
    r2 += r1 >>> 16;
    r1 &= 0xFFFF;
    r2 += a2 * b1;
    r3 += r2 >>> 16;
    r2 &= 0xFFFF;
    r2 += a1 * b2;
    r3 += r2 >>> 16;
    r2 &= 0xFFFF;
    r3 += a3 * b1;
    r4 += r3 >>> 16;
    r3 &= 0xFFFF;
    r3 += a2 * b2;
    r4 += r3 >>> 16;
    r3 &= 0xFFFF;
    r3 += a1 * b3;
    r4 += r3 >>> 16;
    r3 &= 0xFFFF;
    r4 += a4 * b1 + a3 * b2 + a2 * b3 + a1 * b4;
    r4 &= 0xFFFF;

    const rLo = r1 | (r2 << 16);
    const rHi = r3 | (r4 << 16);
    return new Int64(rHi, rLo);
  }

  equals(other: Int64) {
    return this.lo === other.lo && this.hi === other.hi;
  }
}

const INT64_MIN = new Int64(0x80000000, 0);
const INT64_ZERO = new Int64(0, 0);

// Gets the next value from a pseudo-random sequence.
function lcgNext(value: bigint, increment: bigint) {
  value *= BigInt.asIntN(64, value * MULTIPLIER + INCREMENT);
  return BigInt.asIntN(64, value + increment);
}

function square(x: number): number {
  return x * x;
}

function floorMod(x: bigint, y: bigint) {
  x = BigInt.asIntN(64, x);
  y = BigInt.asIntN(64, y);
  let mod = BigInt.asIntN(64, x % y);
  // if the signs are different and modulo not zero, adjust result
  if ((BigInt.asIntN(64, x ^ y)) < 0n && mod !== 0n) {
    mod = BigInt.asIntN(64, mod + y);
  }
  return mod;
}

function getFiddle(value: bigint) {
  const frac = Number(floorMod(value >> 24n, 1024n)) / 1024.0;
  return (frac - 0.5) * 0.9;
}

/**
 * Converts a 32-bit number to a bigint.
 */
function signExtend(n: number): bigint {
  return BigInt.asIntN(32, BigInt(n));
}

function getFiddledDistance(seed: bigint, x1: number, y1: number, z1: number, fx: number, fy: number, fz: number) {
  let rand = lcgNext(seed, signExtend(x1));
  rand = lcgNext(rand, signExtend(y1));
  rand = lcgNext(rand, signExtend(z1));
  rand = lcgNext(rand, signExtend(x1));
  rand = lcgNext(rand, signExtend(y1));
  rand = lcgNext(rand, signExtend(z1));
  const randX = getFiddle(rand);
  rand = lcgNext(rand, seed);
  const randY = getFiddle(rand);
  rand = lcgNext(rand, seed);
  const randZ = getFiddle(rand);
  return square(fz + randZ) + square(fy + randY) + square(fx + randX);
}

/**
 * Biomes are stored in 4x4x4 quarts, so only at 1/4 resolution
 * in each coordinate.
 * Gets the quart that gives the biome for the block at x,y,z.
 * In each coordinate c, it will be either:
 * Math.floor((c - 2)/4) or Math.floor((c - 2)/4) + 1.
 * 
 * A noise function helps smooth the values to give natural-looking
 * biome borders, instead of the lower-resolution quarts.
 */
export function getBiomeSourceQuart(
  biomeZoomSeed: bigint,
  x: number,
  y: number,
  z: number,
): [x: number, y: number, z: number] {
  const centerX = x - 2;
  const centerY = y - 2;
  const centerZ = z - 2;
  const quartX = centerX >> ZOOM_BITS;
  const quartY = centerY >> ZOOM_BITS;
  const quartZ = centerZ >> ZOOM_BITS;
  const fracX = (centerX & ZOOM_MASK) / ZOOM;
  const fracY = (centerY & ZOOM_MASK) / ZOOM;
  const fracZ = (centerZ & ZOOM_MASK) / ZOOM;
  let lowestI = 0;
  let lowest = Infinity;

  for (let i = 0; i < 8; ++i) {
    const bit3 = (i & 4) == 0;
    const bit2 = (i & 2) == 0;
    const bit1 = (i & 1) == 0;
    const bumpX = bit3 ? quartX : quartX + 1;
    const bumpY = bit2 ? quartY : quartY + 1;
    const bumpZ = bit1 ? quartZ : quartZ + 1;
    const fx = bit3 ? fracX : fracX - 1.0;
    const fy = bit2 ? fracY : fracY - 1.0;
    const fz = bit1 ? fracZ : fracZ - 1.0;
    const fiddledDistance = getFiddledDistance(biomeZoomSeed, bumpX, bumpY, bumpZ, fx, fy, fz);
    if (lowest > fiddledDistance) {
      lowestI = i;
      lowest = fiddledDistance;
    }
  }

  const resultX = (lowestI & 4) == 0 ? quartX : quartX + 1;
  const resultY = (lowestI & 2) == 0 ? quartY : quartY + 1;
  const resultZ = (lowestI & 1) == 0 ? quartZ : quartZ + 1;

  const clampedY = Math.max(Math.min(resultY, MAX_BUILD_HEIGHT), MIN_BUILD_HEIGHT);
  return [resultX, clampedY, resultZ];
}
