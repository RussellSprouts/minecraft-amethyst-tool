
import { expandLongPackedArray } from "../long_packed_array";
import { assertNotNull } from "../util";

describe('Long packed array', () => {
  it('should expand values', () => {
    const values = new DataView(new Uint8Array([
      0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10
    ]).buffer);

    expect(expandLongPackedArray(values, 4, 16, true))
      .toEqual(new Uint8Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
      ]));
  });

  it('should skip extra bits if tightlyPacked is false', () => {
    const values = bitsToArray(`
    0 100 011 010 001 000
    111 110 101 100 011 010 001 000
    111 110 101 100 011 010 001 000

    1 001 000 111 110 101
    100 011 010 001 000 111 110 101
    100 011 010 001 000 111 110 101
    `);

    expect(expandLongPackedArray(values, 3, 42, false))
      .toEqual(new Uint8Array([
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1
      ]));
  });

  it('should not skip extra bits if tightlyPackage is true', () => {
    const values = bitsToArray(`
    1 100 011 010 001 000
    111 110 101 100 011 010 001 000
    111 110 101 100 011 010 001 000

    00 001 000 111 110 101
    100 011 010 001 000 111 110 101
    100 011 010 001 000 111 110 10
    `);

    expect(expandLongPackedArray(values, 3, 42, true))
      .toEqual(new Uint8Array([
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1, 2, 3, 4, 5, 6, 7,
        0, 1
      ]));
  });

  it('should support up to 16 bits per item', () => {
    const value = bitsToArray(`
    1111111100000011 1111111100000010
    1111111100000001 1111111100000000

    1111111100000111 1111111100000110
    1111111100000101 1111111100000100

    1111111100001011 1111111100001010
    1111111100001001 1111111100001000
    `);

    expect(expandLongPackedArray(value, 16, 12, true))
      .toEqual(new Uint16Array([
        0xff00, 0xff01, 0xff02, 0xff03, 0xff04, 0xff05,
        0xff06, 0xff07, 0xff08, 0xff09, 0xff0a, 0xff0b
      ]));
  });
});

function bitsToArray(bits: string): DataView {
  bits = bits.replace(/[^01]/g, '');
  if (bits.length % 64 !== 0) {
    throw new Error(`Bad length ${bits.length}`);
  }

  const bytes = assertNotNull(bits.match(/(........)/g));

  return new DataView(
    new Uint8Array(bytes.map(byte => parseInt(byte, 2))).buffer);
}
