/**
 * An NBT parser/serializer which gives results as plain JS objects
 * and avoids copying large arrays, instead giving DataViews of the
 * original data.
 * 
 * In order to provide type safety and distinguish types that have the
 * same JS representation, you can provide a shape object describing
 * the NBT data.
 */

import { checkExhaustive } from "./util";

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

interface NbtCompoundShape {
  readonly [key: string]: NbtShape;
}

interface NbtListShape {
  readonly 0: NbtShape;
}

interface NbtCompoundMapShape {
  readonly '*': NbtShape;
}

/**
 * A description of the shape of an Nbt file.
 * Used for parsing validation and as a guide for serialization.
 */
export type NbtShape =
  'end' | 'byte' | 'short' | 'int' | 'long' | 'float' | 'double' | 'byteArray' | 'intArray' | 'longArray' | 'string'
  // Allow anything -- for reading arbitrary nbt data, can't be written back.
  | '*'
  // A List containing elements of the containing type.
  | NbtListShape
  // A compound with arbitrary keys of the given type.
  | NbtCompoundMapShape
  // A compound with the given keys with the given types.
  | NbtCompoundShape;

/** Maps simple shape names to their JS representation */
export interface SimpleShapeToInterface {
  end: never;
  byte: number;
  short: number;
  int: number;
  long: bigint;
  float: number;
  double: number;
  // Use a DataView for the int arrays so that the values
  // we can just provide a view into the decompressed binary,
  // so that we don't need to make a copy. We can't use
  // a TypedArray because the data is big endian, and TypedArrays
  // are platform endian.
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
export class Nbt<S extends { [key: string]: NbtShape } | '*'> {
  constructor(private shape: S) { }

  /**
   * Parses the data in the Uint8Array into the JS object
   * given by the shape of this Nbt parser.
   */
  parse(data: Uint8Array): ShapeToInterface<S> {
    const asView = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const reader = new DataViewReader(asView);
    return this.parseRoot(reader);
  }

  /**
   * Serializes the JS object into a Uint8Array given
   * by the shape of this Nbt serializer.
   */
  serialize(value: ShapeToInterface<S>): Uint8Array {
    const dataView = this.serializeRoot(value, this.shape);
    return new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
  }

  private parseRoot(data: DataViewReader): ShapeToInterface<S> {
    assert(data.byte() === Tags.Compound, 'Expected a compound at root');
    assert(data.string() === '', 'Expected an empty name at root');
    return this.parsePayload(data, Tags.Compound, this.shape, 'root') as ShapeToInterface<S>;
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
