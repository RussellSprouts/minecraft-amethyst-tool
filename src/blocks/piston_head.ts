import { Block, BlockClass, rotate, texturedCube } from "./block";
import * as textures from '../textures/index';
import * as THREE from 'three';

@BlockClass
export class PistonHead extends Block {
  'facing': 'up' | 'down' | 'east' | 'north' | 'south' | 'west' = 'north';
  'short' = false;
  'type': 'normal' | 'sticky' = 'normal';

  get _model() {
    const type = this['type'];
    const head_side = type === 'sticky' ?
      textures.sticky_piston_head_side : textures.piston_head_side;
    const head_face = type === 'sticky' ?
      textures.sticky_piston_face : textures.piston_face;
    return THREE.BufferGeometryUtils.mergeBufferGeometries([
      texturedCube(
        head_side,
        head_side,
        head_side,
        head_side,
        head_face,
        head_face,
        16, 4, 16, 0, 12, 0
      ),
      texturedCube(
        textures.piston_arm,
        textures.piston_arm,
        textures.piston_arm,
        textures.piston_arm,
        textures.empty,
        textures.empty,
        4, 16, 4,
        6, -4, 6
      )
    ]);
  }

  get _rotation() {
    return rotate(this);
  }
}