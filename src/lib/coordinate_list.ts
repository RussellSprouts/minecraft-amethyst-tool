import { registerDeserialize, Serializable, SerializeResult } from "./async_task";

const SIZE = 10;
const X_OFFSET = 0;
const Y_OFFSET = 8;
const Z_OFFSET = 4;

declare global {
  interface AsyncTaskSerializeFormat {
    coordinateList: {
      data: DataView;
      i: number;
    }
  }
}

export class CoordinateList implements Serializable<'coordinateList'> {
  data: DataView;
  i = 0;
  constructor(initialCapacity = 10) {
    this.data = new DataView(new ArrayBuffer(initialCapacity * 10));
  }

  push(x: number, y: number, z: number) {
    if (this.i + 10 >= this.data.byteLength) {
      const newData = new DataView(new ArrayBuffer(this.data.byteLength * 2));
      new Uint8Array(newData.buffer)
        .set(new Uint8Array(this.data.buffer, 0, this.data.byteLength));
      this.data = newData;
    }

    this.data.setInt32(this.i + X_OFFSET, x);
    this.data.setInt32(this.i + Z_OFFSET, z);
    this.data.setInt16(this.i + Y_OFFSET, y);
    this.i += SIZE;
  }

  getX(i: number): number {
    return this.data.getInt32(i * SIZE + X_OFFSET);
  }

  getY(i: number): number {
    return this.data.getInt16(i * SIZE + Y_OFFSET);
  }

  getZ(i: number): number {
    return this.data.getInt32(i * SIZE + Z_OFFSET);
  }

  serialize(): SerializeResult<'coordinateList'> {
    return {
      typeName: 'coordinateList',
      value: {
        data: this.data,
        i: this.i
      },
      transfer: [this.data.buffer]
    };
  }

  static deserialize(serialized: SerializeResult<'coordinateList'>): CoordinateList {
    const result = new CoordinateList(1);
    result.data = serialized.value.data;
    result.i = serialized.value.i;
    return result;
  }
}
registerDeserialize('coordinateList', CoordinateList);
