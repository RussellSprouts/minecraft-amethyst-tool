import { decompress } from '../compression';
import { Nbt } from '../nbt';

const bigTestNbtStr = 'H4sIAAAAAAAAAO1Uz08aQRR+wgLLloKxxBBjzKu1hKXbzUIRibGIFiyaDRrYqDGGuCvDgi67Znew8dRLe2x66z/TI39Dz732v6DDL3tpz73wMsn35r1v5ntvJnkCBFRyTywOeMuxTY149ONwYj4Iex3HpZMYD4JH3e6EAmK1oqrHeHZcV8uoVQ8byNYeapWGhg2tflh7j4PPg0+Db88DEG5bjj6+pThMZP0Q6tp0piNA3GYuaeG107tz+nYLKdsL4O/oPR44W+8RCFb13l3fC0DgXrf6ZLcEAIxBTHPGCFVM0yAufaTAyMIQs7reWAtTo+5EjkUDMLEnU4xM8ekUo1OMheHZn+Oz8kSBpXwz3di7x6p1E18oHAjXLtFZP68dG2AhWd/68QX+wc78nb0AvPFAyfiFQkBG/p7r6g+TOmiHYLvrMjejKAqOu/XQaWPKTtvp7ObmKzu9Jb5kSQk9qruU/Rh+6NIO2m8VTLFoPivhm5yEmbyEBQllWRZFAP8vKK4v8sKypC4dIHdaO7mMyucp31FByRa1xW2hKq0sxTF/unqSjl6dX/gSBSMb0fa3d6rNlXK8nt9YXUuXrpIXuUTQgMj6Pr+z3FTLB3Vuo7Z2WZKTqdxRUJlrzDXmGv9XIwhCy+kb1njC7P78evt9eNOE39TypPsIBgAA';

describe('Nbt', () => {
  let bigTestNbt!: Uint8Array;
  beforeAll(async () => {
    bigTestNbt = await decompress(
      Uint8Array.from(Buffer.from(bigTestNbtStr, 'base64')));
  });

  it('should parse everything with "*"', () => {
    expect(new Nbt('*').parse(bigTestNbt)).toEqual({
      'longTest': BigInt('9223372036854775807'),
      'shortTest': 32767,
      'stringTest': 'HELLO WORLD THIS IS A TEST STRING ÅÄÖ!',
      'floatTest': 0.4982314705848694,
      'intTest': 2147483647,
      'nested compound test': {
        'ham': {
          'name': 'Hampus',
          'value': 0.75
        },
        'egg': {
          'name': 'Eggbert',
          'value': 0.5
        }
      },
      'listTest (long)': [BigInt(11), BigInt(12), BigInt(13), BigInt(14), BigInt(15)],
      'listTest (compound)': [
        { 'name': 'Compound tag #0', 'created-on': BigInt('1264099775885') },
        { 'name': 'Compound tag #1', 'created-on': BigInt('1264099775885') }
      ],
      'byteTest': 127,
      'byteArrayTest (the first 1000 values of (n*n*255+n*7)%100, starting with n=0 (0, 62, 34, 16, 8, ...))':
        new DataView(new Uint8Array(new Array(1000).map((_, n) => (n * n * 255 + n * 7) % 100)).buffer),
      'doubleTest': 0.4931287132182315
    });
  });

  it('should only output things defined in the shape', () => {
    expect(new Nbt({ 'shortTest': 'short' }).parse(bigTestNbt))
      .toEqual({ 'shortTest': 32767 });
  });

  it('should throw on mismatch', () => {
    expect(() => new Nbt({ 'longTest': 'int' }).parse(bigTestNbt))
      .toThrow();
  });
});