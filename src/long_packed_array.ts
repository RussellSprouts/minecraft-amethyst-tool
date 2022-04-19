
/**
 * Reads a packed bit value from a longArray. Items with a specific number of
 * bits are packed into an array of big-endian longs. Within each long, the
 * first item is at the low-order bits, going towards the high bits.
 * If tightlyPacked is set, then there are no unused bits in each long -- an
 * item may straddle multiple longs. Otherwise, the highest bits of each long
 * may be unused if the bitsPerItem doesn't go evenly into 64.
 * 
 * As an optimization, the code reads the values in 32 bit chunks, since using
 * getBigUint64 is noticeable slower.
 * 
 * Note that bitsPerItem cannot be higher than 32.
 * 
 * @param array The DataView of the longArray
 * @param bitsPerItem The number of bits of each item
 * @param index The item index
 * @param tightlyPacked Whether the items straddle longs, or there are unused bits
 * @returns The item value
 */
export function readLongPackedArray(array: DataView, bitsPerItem: number, index: number, tightlyPacked: boolean) {
  const bitMask = (1 << bitsPerItem) - 1;
  const unusedBitsPerLong = tightlyPacked
    ? 0
    : 64 % bitsPerItem;
  const itemsPerLong = Math.floor(64 / bitsPerItem);
  const bitIndex = index * bitsPerItem + Math.floor(index / itemsPerLong) * unusedBitsPerLong;
  const currentLongIndex = Math.floor(bitIndex / 64) * 8;
  const indexInLong = bitIndex % 64;
  if (indexInLong < 32) {
    // because the longs are big-endian, the low 32 bits are after the high 32 bits
    const currentLongLo = array.getUint32(currentLongIndex + 4);
    const currentLongHi = array.getUint32(currentLongIndex);
    return ((currentLongLo >>> indexInLong) | (currentLongHi << (31 - indexInLong) << 1)) & bitMask;
  } else {
    const currentLongHi = array.getUint32(currentLongIndex);
    const nextLongLo = currentLongIndex + 8 < array.byteLength ? array.getUint32(currentLongIndex + 12) : 0;
    return ((currentLongHi >>> (indexInLong - 32)) | (nextLongLo << (63 - indexInLong) << 1)) & bitMask;
  }
}

export function expandLongPackedArray(array: DataView, bitsPerItem: number, length: number, tightlyPacked: boolean) {
  const result = new Uint16Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = readLongPackedArray(array, bitsPerItem, i, tightlyPacked);
  }
  return result;
}
