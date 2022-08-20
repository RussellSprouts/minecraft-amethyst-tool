/** Renders a 2d map */

import { p } from "./point";
import { assertInstanceOf } from "./util";

const CHUNK_SIZE = 32;
const MIN_SIZE = 4;
export class MapRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private tileMap: Record<string, Uint16Array> = {};
  private listeners: Record<string, Array<(x: number, z: number) => void>> = {
    'click': [],
    'mousemove': []
  };

  private colorIndices: Record<string, number> = {};
  private colors: string[] = [];

  private centerX = 0;
  private centerZ = 0;
  private tileSize = 16;

  private scrollTargetX = 0;
  private scrollTargetZ = 0;
  private scrolling = false;

  private renderRequested = false;

  constructor(
    query: string | HTMLCanvasElement,
    readonly defaultColor = '#999'
  ) {
    this.canvas = query instanceof HTMLCanvasElement
      ? query
      : assertInstanceOf(document.querySelector(query), HTMLCanvasElement);
    this.context = assertInstanceOf(this.canvas.getContext('2d'), CanvasRenderingContext2D);
    this.getColorIndex(this.defaultColor, true);

    const bounds = this.canvas.getBoundingClientRect();
    this.canvas.width = bounds.right - bounds.left;
    this.canvas.height = bounds.bottom - bounds.top;

    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) {
        this.scrolling = false;
        this.centerX -= e.movementX;
        this.centerZ -= e.movementY;
        console.log(e.movementX, e.movementY);
        this.requestRender();
      }
    }, { passive: true });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scrolling = false;
      const oldBounds = this.getBounds();
      const canvasBounds = this.canvas.getBoundingClientRect();
      const oldPxX = (oldBounds.left + e.clientX - canvasBounds.left) / this.tileSize;
      const oldPxZ = (oldBounds.top + e.clientY - canvasBounds.top) / this.tileSize;

      this.tileSize -= Math.sign(e.deltaY);
      if (this.tileSize < MIN_SIZE) {
        this.tileSize = MIN_SIZE;
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

  startScrollTo(x: number, z: number) {
    this.scrolling = true;
    this.scrollTargetX = x;
    this.scrollTargetZ = z;
  }

  private animationFrame() {
    try {
      if (this.scrolling) {
        this.centerX = this.centerX + 0.1 * (this.scrollTargetX - this.centerX);
        this.centerZ = this.centerZ + 0.1 * (this.scrollTargetZ - this.centerZ);

        if (Math.abs(this.centerX - this.scrollTargetX) < 1
          && Math.abs(this.centerZ - this.scrollTargetZ) < 1) {
          this.scrolling = false;
        }
      }

      if (this.renderRequested || this.scrolling) {
        this.render();
        this.renderRequested = false;
      }
    } finally {
      requestAnimationFrame(() => this.animationFrame());
    }
  }

  getTileMapAtCoords(x: number, z: number, create: false): Uint16Array | undefined;
  getTileMapAtCoords(x: number, z: number, create: true): Uint16Array;
  getTileMapAtCoords(x: number, z: number, create = false): Uint16Array | undefined {
    const tileMapX = Math.floor(x / CHUNK_SIZE);
    const tileMapZ = Math.floor(z / CHUNK_SIZE);
    const tileMapPoint = p(tileMapX, 0, tileMapZ);
    const result = this.tileMap[tileMapPoint];
    if (!result && create) {
      return (this.tileMap[tileMapPoint] = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE));
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

  setTileColor(x: number, z: number, color: string) {
    const map = this.getTileMapAtCoords(x, z, true);
    x = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    z = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    map[x + z * CHUNK_SIZE] = this.getColorIndex(color, true);
  }

  getTileColor(x: number, z: number): string {
    const map = this.getTileMapAtCoords(x, z, true);
    if (!map) {
      return this.defaultColor;
    }
    x = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    z = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const colorIndex = map[x + z * CHUNK_SIZE];
    return this.colors[colorIndex] ?? this.defaultColor;
  }

  requestRender() {
    this.renderRequested = true;
  }

  getBounds(): { left: number, right: number, top: number, bottom: number } {
    const canvasCenterX = this.canvas.width / 2;
    const canvasCenterZ = this.canvas.height / 2;

    const left = this.centerX - canvasCenterX;
    const right = this.centerX + canvasCenterX + this.tileSize;
    const top = this.centerZ - canvasCenterZ;
    const bottom = this.centerZ + canvasCenterZ + this.tileSize;
    return { left, right, top, bottom };
  }

  private render() {
    this.context.fillStyle = this.defaultColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // canvas center is centerX
    const { left, right, top, bottom } = this.getBounds();

    for (let j = top; j < bottom; j += this.tileSize) {
      for (let i = left; i < right; i += this.tileSize) {
        const tileX = Math.floor(i / this.tileSize);
        const tileZ = Math.floor(j / this.tileSize);
        this.context.fillStyle =
          this.getTileColor(tileX, tileZ);
        this.context.fillRect(
          Math.floor(tileX * this.tileSize - left),
          Math.floor(tileZ * this.tileSize - top),
          this.tileSize,
          this.tileSize
        );
      }
    }
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
