
export class Seed {
  value: bigint;

  constructor(seed: string) {
    if (seed.match(/^[+-]?[0-9]+$/)) {
      const value = BigInt(seed);
      if (BigInt.asIntN(64, value) === value) {
        this.value = value;
      } else {
        // Numeric value, but outside of the range
        // of 64 bit signed integer.
        this.value = this.stringHashCode(seed);
      }
    } else {
      this.value = this.stringHashCode(seed);
    }
  }

  /**
   * For the biome random noise, use the sha256
   * of the world seed, to ensure uniformly random
   * bits in the seed.
   */
  async biomeSeed() {
    const data = new DataView(new ArrayBuffer(8));
    data.setBigInt64(0, this.value, true);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new DataView(hash).getBigInt64(0, true);
  }

  /**
   * Gets the Java String.hashCode of the given string.
   * 
   * @param value string
   * @returns 
   */
  private stringHashCode(value: string): bigint {
    let h = 0;
    for (let i = 0; i < value.length; i++) {
      h = (((31 * h) | 0) + value.charCodeAt(i)) | 0;
    }
    return BigInt.asIntN(32, BigInt(h));
  }
}