import { Block, BlockClass, DEFAULT_ROTATION, singleColorMaterial, spin, Spinnable, texturedCube } from "./block";
import * as textures from '../../textures/index';
import * as THREE from "three";

@BlockClass
export class Hopper extends Block {
  'enabled': boolean = true;
  'facing': 'down' | 'east' | 'north' | 'south' | 'west' = 'down';

  get _model() {
    const facingSide = this['facing'] !== 'down';
    return THREE.BufferGeometryUtils.mergeBufferGeometries([
      texturedCube(
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        2, 6, 16,
        0, 10, 0
      ),
      texturedCube(
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        2, 6, 16,
        14, 10, 0
      ),
      texturedCube(
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        12, 6, 2,
        2, 10, 14
      ),
      texturedCube(
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        12, 6, 2,
        2, 10, 0
      ),
      texturedCube(
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        12, 1, 12,
        2, 10, 2
      ),
      texturedCube(
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        8, 6, 8,
        4, 4, 4
      ),
      texturedCube(
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        textures.empty,
        4, 4, 4,
        ...facingSide ? [6, 4, 0] : [6, 0, 6]
      ),
    ]);
  }

  get _texture() {
    return singleColorMaterial('#333');
  }

  get _rotation() {
    if (this['facing'] === 'down') {
      return DEFAULT_ROTATION;
    }
    return spin(this as Spinnable);
  }
}