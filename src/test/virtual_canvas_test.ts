
import { Virtual3DCanvas } from "../lib/virtual_canvas";

describe('Virtual3DCanvas', () => {
  let canvas!: Virtual3DCanvas;
  beforeEach(() => {
    canvas = new Virtual3DCanvas();
  });


  it('should handle up to 16 bit values', () => {
    canvas.set(1000, 1000, 1000, 0xFFFF);
    expect(canvas.get(1000, 1000, 1000)).toBe(0xFFFF);
  });

  it('should have a default size of 1x1x1', () => {
    expect(canvas.width).toBe(1);
    expect(canvas.height).toBe(1);
    expect(canvas.length).toBe(1);
  });

  it('should get all extents', () => {
    canvas.set(0, 0, 0, 10);
    canvas.set(99, 99, 99, 10);
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(100);
    expect(canvas.length).toBe(100);
  });

  it('should use the smallest type of Uint array', () => {
    canvas.set(0, 0, 0, 100);
    expect(canvas.getAllBlocks()[0]).toBeInstanceOf(Uint8Array);
    canvas.set(0, 0, 0, 1000);
    expect(canvas.getAllBlocks()[0]).toBeInstanceOf(Uint16Array);
  });
});