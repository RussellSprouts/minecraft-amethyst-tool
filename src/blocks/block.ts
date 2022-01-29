import { parseBlockState } from "../litematic";
import * as THREE from 'three';
import * as textures from '../../textures/index';
import { checkExhaustive } from "../util";

const cubeVertices = [
  // front
  { pos: [-0.5, -0.5, 0.5], norm: [0, 0, 1], uv: [0, 0], },
  { pos: [0.5, -0.5, 0.5], norm: [0, 0, 1], uv: [1, 0], },
  { pos: [-0.5, 0.5, 0.5], norm: [0, 0, 1], uv: [0, 1], },
  { pos: [0.5, 0.5, 0.5], norm: [0, 0, 1], uv: [1, 1], },
  // right
  { pos: [0.5, -0.5, 0.5], norm: [1, 0, 0], uv: [0, 0], },
  { pos: [0.5, -0.5, -0.5], norm: [1, 0, 0], uv: [1, 0], },
  { pos: [0.5, 0.5, 0.5], norm: [1, 0, 0], uv: [0, 1], },
  { pos: [0.5, 0.5, -0.5], norm: [1, 0, 0], uv: [1, 1], },
  // back
  { pos: [0.5, -0.5, -0.5], norm: [0, 0, -1], uv: [0, 0], },
  { pos: [-0.5, -0.5, -0.5], norm: [0, 0, -1], uv: [1, 0], },
  { pos: [0.5, 0.5, -0.5], norm: [0, 0, -1], uv: [0, 1], },
  { pos: [-0.5, 0.5, -0.5], norm: [0, 0, -1], uv: [1, 1], },
  // left
  { pos: [-0.5, -0.5, -0.5], norm: [-1, 0, 0], uv: [0, 0], },
  { pos: [-0.5, -0.5, 0.5], norm: [-1, 0, 0], uv: [1, 0], },
  { pos: [-0.5, 0.5, -0.5], norm: [-1, 0, 0], uv: [0, 1], },
  { pos: [-0.5, 0.5, 0.5], norm: [-1, 0, 0], uv: [1, 1], },
  // top
  { pos: [0.5, 0.5, -0.5], norm: [0, 1, 0], uv: [0, 0], },
  { pos: [-0.5, 0.5, -0.5], norm: [0, 1, 0], uv: [1, 0], },
  { pos: [0.5, 0.5, 0.5], norm: [0, 1, 0], uv: [0, 1], },
  { pos: [-0.5, 0.5, 0.5], norm: [0, 1, 0], uv: [1, 1], },
  // bottom
  { pos: [0.5, -0.5, 0.5], norm: [0, -1, 0], uv: [0, 0], },
  { pos: [-0.5, -0.5, 0.5], norm: [0, -1, 0], uv: [1, 0], },
  { pos: [0.5, -0.5, -0.5], norm: [0, -1, 0], uv: [0, 1], },
  { pos: [-0.5, -0.5, -0.5], norm: [0, -1, 0], uv: [1, 1], },
];

const indices = new Uint16Array([
  0, 1, 2, 2, 1, 3,       // front
  4, 5, 6, 6, 5, 7,       // right
  8, 9, 10, 10, 9, 11,    // back
  12, 13, 14, 14, 13, 15, // left
  16, 17, 18, 18, 17, 19, // top
  20, 21, 22, 22, 21, 23, // bottom
]);

const positionsArr: number[] = [];
const normalsArr: number[] = [];
const uvsArr: number[] = [];
for (const vertex of cubeVertices) {
  positionsArr.push(...vertex.pos);
  normalsArr.push(...vertex.norm);
  uvsArr.push(...vertex.uv);
}
const positions = new Float32Array(positionsArr);
const normals = new Float32Array(normalsArr);
const uvs = new Float32Array(uvsArr);

/**
 * Creates geometry with UV mappings to map the faces
 * to the given textures.
 * 
 * @param south the south face texture
 * @param east the east face texture
 * @param north the north face texture
 * @param west the west face texture
 * @param up the up face texture
 * @param down the down face texture
 * @param width the width in pixels
 * @param height the height in pixels
 * @param length the length in pixels
 * @param startX the position within the block
 * @param startY the position within the block
 * @param startZ the position within the block
 * @param overlap offsets the faces inward
 */
export function texturedCube(
  south: number,
  east: number,
  north: number,
  west: number,
  up: number,
  down: number,
  width = 16,
  height = 16,
  length = 16,
  startX = 0,
  startY = 0,
  startZ = 0,
  overlap = 0,
): THREE.BufferGeometry {
  const faces = [
    south,
    east,
    north,
    west,
    up,
    down,
  ];
  const geometry = new THREE.BufferGeometry();
  if (width === 16 && height === 16 && length === 16 && overlap === 0) {
    geometry.setAttribute('position',
      new THREE.BufferAttribute(positions, 3));
  } else {
    const newPositions = new Float32Array(positions);
    for (let i = 0; i < newPositions.length; i += 3) {
      newPositions[i] = (startX - normals[i] * overlap + (newPositions[i] > 0 ? width : 0)) / 16 - 0.5;
      newPositions[i + 1] = (startY - normals[i + 1] * overlap + (newPositions[i + 1] > 0 ? height : 0)) / 16 - 0.5;
      newPositions[i + 2] = (startZ - normals[i + 2] * overlap + (newPositions[i + 2] > 0 ? length : 0)) / 16 - 0.5;
    }
    geometry.setAttribute('position',
      new THREE.BufferAttribute(newPositions, 3));
  }
  geometry.setAttribute('normal',
    new THREE.BufferAttribute(normals, 3));

  const sizes = [
    [width, height],
    [length, height],
    [width, height],
    [length, height],
    [width, length],
    [width, length]
  ];

  const newUvs = new Float32Array(uvs);
  for (let i = 0; i < newUvs.length; i += 2) {
    const faceIndex = Math.floor(i / 8);
    const face = faces[faceIndex];
    const [textureWidth, textureHeight] = sizes[faceIndex];
    const uvStartX = 0;
    const uvEndX = textureWidth / 16;
    const uvStartY = (textures.nImages - face - textureHeight / 16) / textures.nImages;
    const uvEndY = (textures.nImages - face) / textures.nImages;
    newUvs[i] = newUvs[i] ? uvEndX : uvStartX; // x
    newUvs[i + 1] = newUvs[i + 1] ? uvEndY : uvStartY; // y
  }

  geometry.setAttribute('uv',
    new THREE.BufferAttribute(newUvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

export function singleTexturedCube(face: number) {
  return texturedCube(face, face, face, face, face, face);
}

export function singleColorMaterial(color: string, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    opacity,
    transparent: opacity !== 1
  });
}

export const spriteSheet = new THREE.TextureLoader().load(textures.image);
spriteSheet.minFilter = THREE.NearestFilter;
spriteSheet.magFilter = THREE.NearestFilter;

export const DEFAULT_ROTATION = new THREE.Euler(0, 0, 0);
export const ROTATE_DOWN = new THREE.Euler(Math.PI, 0, 0);
export const ROTATE_NORTH = new THREE.Euler(-Math.PI / 2, 0, 0);
export const ROTATE_SOUTH = new THREE.Euler(-Math.PI / 2, 0, Math.PI);
export const ROTATE_EAST = new THREE.Euler(-Math.PI / 2, 0, -Math.PI / 2);
export const ROTATE_WEST = new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2);
export const SPIN_WEST = new THREE.Euler(0, Math.PI / 2, 0);
export const SPIN_SOUTH = new THREE.Euler(0, Math.PI, 0);
export const SPIN_EAST = new THREE.Euler(0, -Math.PI / 2, 0);

export type BlockData = { readonly 'Name': string, readonly 'Properties': Readonly<Record<string, string>> };

export const DEFAULT_TEXTURE = new THREE.MeshStandardMaterial({ map: spriteSheet });
export const DEFAULT_TRANSPARENT = new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, alphaTest: 0.5 });
const DEFAULT_MODEL = singleTexturedCube(textures.missing);

export class Block {
  get _model(): THREE.BufferGeometry {
    return DEFAULT_MODEL;
  };

  get _texture(): THREE.Material | THREE.Material[] {
    return DEFAULT_TEXTURE;
  }

  get _rotation(): THREE.Euler {
    return DEFAULT_ROTATION;
  }

  constructor(data: BlockData) {
  }
}

export function BlockClass<T extends { new(...args: any[]): Block }>(constructor: T) {
  const getters = Object.getOwnPropertyDescriptors(constructor.prototype);
  for (const [prop, descriptor] of Object.entries(getters)) {
    if (descriptor.get) {
      const originalGet = descriptor.get;
      Object.defineProperty(constructor.prototype, prop, {
        get(this: Block) {
          const value = originalGet.call(this);
          Object.defineProperty(this, prop, { value });
          return value;
        }
      });
    }
  }

  const wrappedConstructor = class extends constructor {
    constructor(...args: any[]) {
      super(args[0]);
      for (const [key, value] of Object.entries(args[0]['Properties'])) {
        const anyThis = this as any;
        if (anyThis[key] === undefined) {
          console.warn('Missing default value for', args[0]['Name'], key);
        }

        if (typeof anyThis[key] === 'number') {
          anyThis[key] = Number(value);
        } else if (typeof anyThis[key] === 'boolean') {
          anyThis[key] = value === 'true';
        } else {
          anyThis[key] = value;
        }
      }
    }
  };
  return wrappedConstructor;
}

export interface Spinnable {
  readonly 'facing': 'north' | 'south' | 'east' | 'west';
}

export interface Rotatable {
  readonly 'facing': 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
}

/**
 * Generates versions of the block that are rotated around
 * the y axis to face different directions.
 * 
 * e.g. repeaters, furnaces
 */
export function spin(block: Spinnable): THREE.Euler {
  if (block['facing'] === 'north') {
    return DEFAULT_ROTATION;
  } else if (block['facing'] === 'south') {
    return SPIN_SOUTH;
  } else if (block['facing'] === 'east') {
    return SPIN_EAST;
  } else if (block['facing'] === 'west') {
    return SPIN_WEST;
  }
  return checkExhaustive(block['facing']);
}

export function rotate(block: Rotatable): THREE.Euler {
  if (block['facing'] === 'up') {
    return DEFAULT_ROTATION;
  } else if (block['facing'] === 'south') {
    return ROTATE_SOUTH;
  } else if (block['facing'] === 'east') {
    return ROTATE_EAST;
  } else if (block['facing'] === 'west') {
    return ROTATE_WEST;
  } else if (block['facing'] === 'down') {
    return ROTATE_DOWN;
  } else if (block['facing'] === 'north') {
    return ROTATE_NORTH;
  }
  return checkExhaustive(block['facing']);
}

export function BasicSingleTexture(face: number) {
  @BlockClass
  class Class extends Block {
    get _model() {
      return singleTexturedCube(face);
    }
  }

  return Class;
}

export function BasicSingleColor(color: string, opacity?: number) {
  @BlockClass
  class Class extends Block {
    get _texture() {
      return singleColorMaterial(color, opacity);
    }
  }

  return Class;
}