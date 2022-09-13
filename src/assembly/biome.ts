
const ZOOM_BITS = 2;
const ZOOM = 4;
const ZOOM_MASK = 3;

const MIN_BUILD_HEIGHT = -16;
const MAX_BUILD_HEIGHT = 19;

// Parameters for LCG pseudo-random numbers, by Donald Knuth
const MULTIPLIER: i64 = 6364136223846793005;
const INCREMENT: i64 = 1442695040888963407;

// Gets the next value from a pseudo-random sequence.
function lcgNext(value: i64, increment: i64): i64 {
  value *= value * MULTIPLIER + INCREMENT;
  return value + increment;
}

function square(x: f64): f64 {
  return x * x;
}

function floorMod(x: i64, y: i64): i64 {
  let mod = x % y;
  // if the signs are different and modulo not zero, adjust result
  if ((x ^ y) < 0 && mod !== 0) {
    mod = mod + y;
  }
  return mod;
}

function getFiddle(value: i64): f64 {
  const frac = f64(floorMod(value >> 24, 1024)) / 1024.0;
  return (frac - 0.5) * 0.9;
}

function getFiddledDistance(seed: i64, x1: i32, y1: i32, z1: i32, fx: f64, fy: f64, fz: f64): f64 {
  let rand = lcgNext(seed, i64(x1));
  rand = lcgNext(rand, i64(y1));
  rand = lcgNext(rand, i64(z1));
  rand = lcgNext(rand, i64(x1));
  rand = lcgNext(rand, i64(y1));
  rand = lcgNext(rand, i64(z1));
  const randX = getFiddle(rand);
  rand = lcgNext(rand, seed);
  const randY = getFiddle(rand);
  rand = lcgNext(rand, seed);
  const randZ = getFiddle(rand);
  return square(fz + randZ) + square(fy + randY) + square(fx + randX);
}

export let biomeX: i32;
export let biomeY: i32;
export let biomeZ: i32;

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
  biomeZoomSeed: i64,
  x: i32,
  y: i32,
  z: i32,
): void {
  const centerX = x - 2;
  const centerY = y - 2;
  const centerZ = z - 2;
  const quartX = centerX >> ZOOM_BITS;
  const quartY = centerY >> ZOOM_BITS;
  const quartZ = centerZ >> ZOOM_BITS;
  const fracX = f64(centerX & ZOOM_MASK) / ZOOM;
  const fracY = f64(centerY & ZOOM_MASK) / ZOOM;
  const fracZ = f64(centerZ & ZOOM_MASK) / ZOOM;
  let lowestI: u32 = 0;
  let lowest: f64 = Infinity;

  for (let i: u32 = 0; i < 8; ++i) {
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

  biomeX = (lowestI & 4) == 0 ? quartX : quartX + 1;
  biomeY = (lowestI & 2) == 0 ? quartY : quartY + 1;
  biomeZ = (lowestI & 1) == 0 ? quartZ : quartZ + 1;

  if (biomeY < MIN_BUILD_HEIGHT) {
    biomeY = MIN_BUILD_HEIGHT;
  }
  if (biomeY > MAX_BUILD_HEIGHT) {
    biomeY = MAX_BUILD_HEIGHT;
  }
}
