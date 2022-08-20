/**
 * A DataView which has a default endianness.
 */
export class DefaultEndianDataView extends DataView {
  constructor(public readonly littleEndian: boolean, buffer: ArrayBufferLike, byteOffset?: number, byteLength?: number) {
    super(buffer, byteOffset, byteLength);
  }

  override getFloat32(byteOffset: number, littleEndian = this.littleEndian): number {
    return super.getFloat32(byteOffset, littleEndian);
  }
  override getFloat64(byteOffset: number, littleEndian = this.littleEndian): number {
    return super.getFloat64(byteOffset, littleEndian);
  }
  override getInt16(byteOffset: number, littleEndian = this.littleEndian): number {
    return super.getInt16(byteOffset, littleEndian);
  }
  override getInt32(byteOffset: number, littleEndian = this.littleEndian): number {
    return super.getInt32(byteOffset, littleEndian);
  }
  override getUint16(byteOffset: number, littleEndian = this.littleEndian): number {
    return super.getUint16(byteOffset, littleEndian);
  }
  override getUint32(byteOffset: number, littleEndian = this.littleEndian): number {
    return super.getUint32(byteOffset, littleEndian);
  }
  override setFloat32(byteOffset: number, value: number, littleEndian = this.littleEndian): void {
    super.setFloat32(byteOffset, value, littleEndian);
  }
  override setFloat64(byteOffset: number, value: number, littleEndian = this.littleEndian): void {
    super.setFloat64(byteOffset, value, littleEndian);
  }
  override setInt16(byteOffset: number, value: number, littleEndian = this.littleEndian): void {
    super.setInt16(byteOffset, value, littleEndian);
  }
  override setInt32(byteOffset: number, value: number, littleEndian = this.littleEndian): void {
    super.setInt32(byteOffset, value, littleEndian);
  }
  override setUint16(byteOffset: number, value: number, littleEndian = this.littleEndian): void {
    super.setUint16(byteOffset, value, littleEndian);
  }
  override setUint32(byteOffset: number, value: number, littleEndian = this.littleEndian): void {
    super.setUint32(byteOffset, value, littleEndian);
  }
  override getBigInt64(byteOffset: number, littleEndian = this.littleEndian): bigint {
    return super.getBigInt64(byteOffset, littleEndian);
  }
  override getBigUint64(byteOffset: number, littleEndian = this.littleEndian): bigint {
    return super.getBigInt64(byteOffset, littleEndian);
  }
  override setBigInt64(byteOffset: number, value: bigint, littleEndian = this.littleEndian): void {
    super.setBigInt64(byteOffset, value, littleEndian);
  }
  override setBigUint64(byteOffset: number, value: bigint, littleEndian = this.littleEndian): void {
    super.setBigUint64(byteOffset, value, littleEndian);
  }

  subview(byteOffset: number, length: number): DefaultEndianDataView {
    return new DefaultEndianDataView(
      this.littleEndian,
      this.buffer,
      this.byteOffset + byteOffset,
      length
    );
  }
}