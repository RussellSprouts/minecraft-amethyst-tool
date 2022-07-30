/**
 * An NBT parser/serializer which gives results as plain JS objects
 * and avoids copying large arrays, instead giving DataViews of the
 * original data.
 * 
 * In order to provide type safety and distinguish types that have the
 * same JS representation, you can provide a shape object describing
 * the NBT data.
 */

import { DataViewReader, DataViewWriter } from "./data_view_stream";
import { DefaultEndianDataView } from "./default_endian_data_view";
import { checkExhaustive } from "./util";

/** The possible Nbt tags. */
const enum Tags {
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
}

interface NbtCompoundShape {
  readonly [key: string]: NbtShape;
}

type NbtListShape = readonly [NbtShape];

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
  // Use a DataView for the int arrays so that
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
  parse(data: Uint8Array, littleEndian = false): ShapeToInterface<S> {
    const asView = new DefaultEndianDataView(littleEndian, data.buffer, data.byteOffset, data.byteLength);
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
    data.string();
    return this.parsePayload(data, Tags.Compound, this.shape, 'root') as ShapeToInterface<S>;
  }

  /**
   * Parses the payload value at the current position of the DataViewReader.
   * 
   * @param data The data view reader
   * @param tagType The tag of the payload to parse
   * @param shape The shape of the data
   * @param path The path so far, used for error messages
   * @returns The payload value, based 
   */
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
        return data.array(4);
      case Tags.LongArray:
        this.assertSimpleShape(shape, 'longArray', path);
        return data.array(8);
      case Tags.Compound: {
        this.assertCompoundShape(shape, path);
        const result: { [key: string]: unknown } = {};
        let tagType: Tags;
        while ((tagType = data.byte()) !== Tags.End) {
          const name = data.string();
          if (shape === '*' || shape['*'] || name in shape) {
            result[name] = this.parsePayload(data, tagType, shapeGet(shape, name), `${path}.${name}`);
          } else {
            this.skipPayload(data, tagType);
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

  /**
   * Skips the payload of the given type at the current position of the 
   * DataViewReader. Simply advances with minimal processing of the data,
   * so that we can quickly skip over parts that we don't understand.
   * @param data The data view reader
   * @param tagType The tag of the payload to skip
   */
  private skipPayload(data: DataViewReader, tagType: Tags): void {
    switch (tagType) {
      case Tags.End:
        return undefined;
      case Tags.Byte:
        data.skip(1);
        return;
      case Tags.Short:
        data.skip(2);
        return;
      case Tags.Int:
        data.skip(4);
        return;
      case Tags.Long:
        data.skip(8);
        return;
      case Tags.Float:
        data.skip(4);
        return;
      case Tags.Double:
        data.skip(8);
        return;
      case Tags.String:
        data.skipString();
        return;
      case Tags.ByteArray:
        data.skipArray(1);
        return;
      case Tags.IntArray:
        data.skipArray(4);
        return;
      case Tags.LongArray:
        data.skipArray(8);
        return;
      case Tags.Compound: {
        let tagType: Tags;
        while ((tagType = data.byte()) !== Tags.End) {
          data.skipString();
          this.skipPayload(data, tagType);
        }
        return;
      }
      case Tags.List: {
        const itemType = data.byte() as Tags;
        const nItems = data.int();
        for (let i = 0; i < nItems; i++) {
          this.skipPayload(data, itemType);
        }
        return;
      }
      default:
        checkExhaustive(tagType);
    }
  }

  private assertSimpleShape<T extends NbtShape>(shape: NbtShape, t: T, path: string): asserts shape is T | '*' {
    assert(shape === '*' || shape === t, `Found a ${t}, but expected ${shape}`, path);
  }

  private assertCompoundShape(shape: NbtShape, path: string): asserts shape is { [key: string]: NbtShape } | '*' {
    assert(shape === '*' || !Array.isArray(shape) && typeof shape === 'object', `Found ${shape}, but expected a compound.`, path);
  }

  private assertListShape(shape: NbtShape, path: string): asserts shape is [NbtShape] | '*' {
    assert(shape === '*' || Array.isArray(shape), `Found ${shape}, but expected a list`, path);
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
