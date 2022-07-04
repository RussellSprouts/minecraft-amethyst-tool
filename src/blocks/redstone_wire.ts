import * as THREE from "three";
import { Block, BlockClass, spriteSheet, texturedCube } from "./block";
import * as textures from '../textures/index';

type RedstoneSide = 'none' | 'side' | 'up';

const REDSTONE_BOTTOM_TEXTURE: Record<string, number> = {
  '': textures.redstone_dot,
  'n': textures.redstone_ns,
  's': textures.redstone_ns,
  'e': textures.redstone_ew,
  'w': textures.redstone_ew,
  'ns': textures.redstone_ns,
  'ew': textures.redstone_ew,
  'nw': textures.redstone_nw,
  'ne': textures.redstone_ne,
  'se': textures.redstone_se,
  'sw': textures.redstone_sw,
  'nsw': textures.redstone_nsw,
  'new': textures.redstone_new,
  'nse': textures.redstone_nse,
  'sew': textures.redstone_sew,
  'nsew': textures.redstone_nsew,
};

@BlockClass
export class RedstoneWire extends Block {
  'east': RedstoneSide = 'none';
  'north': RedstoneSide = 'none';
  'power' = 0;
  'south': RedstoneSide = 'none';
  'west': RedstoneSide = 'none';

  get _model(): THREE.BufferGeometry {
    const east = this['east'];
    const north = this['north'];
    const power = this['power'];
    const south = this['south'];
    const west = this['west'];
    const poweredOffset = power === 0 ? 1 : 0;
    return texturedCube(
      south === 'up' ? poweredOffset + textures.redstone_ns : textures.empty,
      east === 'up' ? poweredOffset + textures.redstone_ns : textures.empty,
      north === 'up' ? poweredOffset + textures.redstone_ns : textures.empty,
      west === 'up' ? poweredOffset + textures.redstone_ns : textures.empty,
      textures.empty,
      REDSTONE_BOTTOM_TEXTURE[
      (north === 'none' ? '' : 'n')
      + (south === 'none' ? '' : 's')
      + (east === 'none' ? '' : 'e')
      + (west === 'none' ? '' : 'w')
      ] + poweredOffset,
      16, 16, 16, 0, 0, 0,
      0.01 // offset a tiny bit to prevent texture fighting
    );
  }

  get _texture(): THREE.Material | THREE.Material[] {
    return new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });
  }
}