/** Renders a 2d map */

import { p, Point } from "./point";
import { $, assertInstanceOf } from "./util";

const CHUNK_SIZE = 32;
const CHUNK_MASK = CHUNK_SIZE - 1;

const MIN_TILE_SIZE = 2;

export class MapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private tileMap1: Record<Point, Uint16Array> = {};
  private tileMap4: Record<Point, Uint16Array> = {};
  private tileMap16: Record<Point, Uint16Array> = {};
  private overlay: Record<Point, Uint16Array> = {};

  private lod: 1 | 4 | 16 = 1;

  private colorIndices: Record<string, number> = {};
  private colors: string[] = [];

  private centerX = 0;
  private centerZ = 0;
  private tileSize = 16;

  private lod4Enabled = false;
  private lod16Enabled = false;

  private renderRequested = false;

  setLod(level: 1 | 4 | 16) {
    this.lod = level;
  }

  constructor(
    query: string | HTMLCanvasElement,
    readonly defaultColor = '#999'
  ) {
    this.canvas = query instanceof HTMLCanvasElement
      ? query
      : $(query, HTMLCanvasElement);
    this.context = assertInstanceOf(this.canvas.getContext('2d'), CanvasRenderingContext2D);
    this.getColorIndex(this.defaultColor, true);

    this.resizeToElement();

    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) {
        this.centerX -= e.movementX;
        this.centerZ -= e.movementY;
        this.requestRender();
      }
    }, { passive: true });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const oldBounds = this.getBounds();
      const canvasBounds = this.canvas.getBoundingClientRect();
      const oldPxX = (oldBounds.left + e.clientX - canvasBounds.left) / this.tileSize;
      const oldPxZ = (oldBounds.top + e.clientY - canvasBounds.top) / this.tileSize;

      this.tileSize -= Math.sign(e.deltaY) / this.lod;
      if (this.lod === 1) {
        if (this.tileSize < MIN_TILE_SIZE) {
          this.tileSize = MIN_TILE_SIZE;

          if (this.lod4Enabled) {
            this.setLod(4);
          }
        }
      } else if (this.lod === 4) {
        if (this.tileSize < MIN_TILE_SIZE / this.lod) {
          this.tileSize = MIN_TILE_SIZE / this.lod;

          if (this.lod16Enabled) {
            this.setLod(16);
          }
        } else if (this.tileSize >= MIN_TILE_SIZE) {
          this.setLod(1);
          this.tileSize = MIN_TILE_SIZE;
        }
      } else if (this.lod === 16) {
        if (this.tileSize < MIN_TILE_SIZE / this.lod) {
          this.tileSize = MIN_TILE_SIZE / this.lod;
        } else if (this.tileSize >= MIN_TILE_SIZE / 4) {
          this.setLod(4);
          this.tileSize = Math.round(this.tileSize * 2) / 2;
        }
      }

      const newBounds = this.getBounds();
      const newPxX = (newBounds.left + e.clientX - canvasBounds.left) / this.tileSize;
      const newPxZ = (newBounds.top + e.clientY - canvasBounds.top) / this.tileSize;

      this.centerX += this.tileSize * (oldPxX - newPxX);
      this.centerZ += this.tileSize * (oldPxZ - newPxZ);

      this.requestRender();
    });

    requestAnimationFrame(() => this.animationFrame());
  }

  private animationFrame() {
    try {
      if (this.isVisible() && this.renderRequested) {
        this.render();
        this.renderRequested = false;
      }
    } finally {
      requestAnimationFrame(() => this.animationFrame());
    }
  }

  getTileMapAtCoords(x: number, z: number, create: false, lod: 1 | 4 | 16): Uint16Array | undefined;
  getTileMapAtCoords(x: number, z: number, create: true, lod: 1 | 4 | 16): Uint16Array;
  getTileMapAtCoords(x: number, z: number, create = false, lod: 1 | 4 | 16): Uint16Array | undefined {
    const tileMapX = Math.floor(x / CHUNK_SIZE);
    const tileMapZ = Math.floor(z / CHUNK_SIZE);
    const tileMapPoint = p(tileMapX, 0, tileMapZ);
    const tileMap = lod === 1 ? this.tileMap1 : lod === 4 ? this.tileMap4 : this.tileMap16;
    const result = tileMap[tileMapPoint];
    if (!result && create) {
      return (tileMap[tileMapPoint] = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE));
    }
    return result;
  }

  getColorIndex(color: string, create = false): number {
    const result = this.colorIndices[color];
    if (!result && create) {
      const next = this.colors.length;
      this.colors[next] = color;
      this.colorIndices[color] = next;
      return next;
    }
    return result ?? 0;
  }

  setTileColor(x: number, z: number, color: string, lod: 1 | 4 | 16 = 1) {
    if (lod === 4) {
      this.lod4Enabled = true;
    } else if (lod === 16) {
      this.lod4Enabled = this.lod16Enabled = true;
    }
    x = Math.floor(x / lod);
    z = Math.floor(z / lod);
    const map = this.getTileMapAtCoords(x, z, true, lod);
    x = x & CHUNK_MASK;
    z = z & CHUNK_MASK;

    map[x + z * CHUNK_SIZE] = this.getColorIndex(color, true);
  }

  setOverlayColor(x: number, z: number, color: string, lod: 1 | 4 | 16) {
    x = Math.floor(x / lod);
    z = Math.floor(z / lod);

  }

  getTileColor(ox: number, oz: number, lod: 1 | 4 | 16 = 1): string {
    let x = Math.floor(ox / lod);
    let z = Math.floor(oz / lod);
    const map = this.getTileMapAtCoords(x, z, true, lod);
    if (!map) {
      return this.defaultColor;
    }
    x = x & CHUNK_MASK;
    z = z & CHUNK_MASK;
    const colorIndex = map[x + z * CHUNK_SIZE];
    if (colorIndex === 0 && lod !== 16) {
      const result = this.getTileColor(ox, oz, (lod * 4) as (4 | 16));
      return result;
    }
    return this.colors[colorIndex] ?? this.defaultColor;
  }

  requestRender() {
    this.renderRequested = true;
  }

  getBounds(): { left: number, right: number, top: number, bottom: number } {
    const canvasCenterX = this.canvas.width / 2;
    const canvasCenterZ = this.canvas.height / 2;

    const left = this.centerX - canvasCenterX;
    const right = this.centerX + canvasCenterX + this.tileSize * this.lod;
    const top = this.centerZ - canvasCenterZ;
    const bottom = this.centerZ + canvasCenterZ + this.tileSize * this.lod;
    return { left, right, top, bottom };
  }

  private render() {
    this.resizeToElement();
    this.context.fillStyle = this.defaultColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // canvas center is centerX
    const { left, right, top, bottom } = this.getBounds();

    for (let j = top; j < bottom; j += this.tileSize * this.lod) {
      for (let i = left; i < right; i += this.tileSize * this.lod) {
        const tileX = Math.floor(i / this.tileSize / this.lod);
        const tileZ = Math.floor(j / this.tileSize / this.lod);
        this.context.fillStyle =
          this.getTileColor(tileX * this.lod, tileZ * this.lod, this.lod);
        this.context.fillRect(
          Math.floor(tileX * this.tileSize * this.lod - left),
          Math.floor(tileZ * this.tileSize * this.lod - top),
          this.tileSize * this.lod,
          this.tileSize * this.lod
        );
      }
    }
  }

  private resizeToElement() {
    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width !== 0 && bounds.height !== 0) {
      this.canvas.width = bounds.width;
      this.canvas.height = bounds.height;
    }
  }

  private isVisible() {
    return this.canvas.offsetParent !== null;
  }

  addEventListener(evt: 'mousemove' | 'click', cb: (x: number, z: number) => void) {
    this.canvas.addEventListener(evt, (e) => {
      const { left, top } = this.getBounds();
      const canvasBounds = this.canvas.getBoundingClientRect();
      const pxX = e.clientX - canvasBounds.left;
      const pxZ = e.clientY - canvasBounds.top;
      const tileX = Math.floor((left + pxX) / this.tileSize);
      const tileZ = Math.floor((top + pxZ) / this.tileSize);
      cb(tileX, tileZ);
    }, { passive: true });
  }
}
