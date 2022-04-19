/** Renders a 2d map */

import { p } from "./point";

const CHUNK_SIZE = 32;
export class MapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly stringIndex: Record<string, number> = {};
  private readonly indexString: string[] = [];
  private nextIndex = 0;
  private tileMap: Record<string, Uint16Array> = {};

  constructor(query: string) {
    this.canvas = document.querySelector(query)!;
  }

  getTileMap(x: number, z: number) {
    const tileIndexX = Math.floor(x / CHUNK_SIZE);
    const tileIndexZ = Math.floor(z / CHUNK_SIZE);
    const point = p(tileIndexX, 0, tileIndexZ);
    if (this.tileMap[point]) {
      return this.tileMap[point];
    }
    return (this.tileMap[point] = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE));
  }

  getTileIndex(value: string) {
    if (this.stringIndex[value]) {
      return this.stringIndex[value];
    }
    this.indexString.push(value);
    return (this.stringIndex[value] = this.nextIndex++);
  }

  setTile(x: number, z: number, value: string) {
    const index = this.getTileIndex(value);
    const tileMap = this.getTileMap(x, z);
    tileMap[(x % CHUNK_SIZE) + CHUNK_SIZE * (z % CHUNK_SIZE)] = index;
  }

  getTile(x: number, z: number): string {
    const tileMap = this.getTileMap(x, z);
    return this.indexString[tileMap[(x % CHUNK_SIZE) + CHUNK_SIZE * (z % CHUNK_SIZE)]];
  }
}
