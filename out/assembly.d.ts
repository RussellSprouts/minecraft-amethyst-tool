declare namespace __AdaptedExports {
  /** src/assembly/biome/biomeX */
  export const biomeX: {
    /** @type `i32` */
    get value(): number;
    set value(value: number);
  };
  /** src/assembly/biome/biomeY */
  export const biomeY: {
    /** @type `i32` */
    get value(): number;
    set value(value: number);
  };
  /** src/assembly/biome/biomeZ */
  export const biomeZ: {
    /** @type `i32` */
    get value(): number;
    set value(value: number);
  };
  /**
   * src/assembly/biome/getBiomeSourceQuart
   * @param biomeZoomSeed `i64`
   * @param x `i32`
   * @param y `i32`
   * @param z `i32`
   */
  export function getBiomeSourceQuart(biomeZoomSeed: bigint, x: number, y: number, z: number): void;
}
/** Instantiates the compiled WebAssembly module with the given imports. */
export declare function instantiate(module: WebAssembly.Module, imports: {
}): Promise<typeof __AdaptedExports>;
