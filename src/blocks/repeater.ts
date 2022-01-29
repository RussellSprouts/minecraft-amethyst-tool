import { Block, BlockClass, DEFAULT_TRANSPARENT, spin, texturedCube } from "./block";
import * as textures from '../../textures/index';
import * as THREE from "three";

@BlockClass
export class Repeater extends Block {
  'delay': 1 | 2 | 3 | 4 = 1;
  'facing': 'east' | 'north' | 'south' | 'west' = 'north';
  'locked' = false;
  'powered' = false;

  get _model() {
    const powered = this['powered'];
    const ticks = this['delay'];
    const torch_side = powered ? textures.repeater_torch_on : textures.repeater_torch_off;
    const torch_top = powered ? textures.torch_top_on : textures.torch_top_off;
    return THREE.BufferGeometryUtils.mergeBufferGeometries([
      // repeater body
      texturedCube(
        textures.repeater_side,
        textures.repeater_side,
        textures.repeater_side,
        textures.repeater_side,
        powered ? textures.repeater_top_lit : textures.repeater_top,
        textures.repeater_bottom,
        16, 2, 16
      ),
      // moving torch
      texturedCube(
        torch_side,
        torch_side,
        torch_side,
        torch_side,
        torch_top,
        torch_top,
        4, 6, 4,
        6, 2, 9 - 2 * ticks, 1
      ),
      // front torch
      texturedCube(
        torch_side,
        torch_side,
        torch_side,
        torch_side,
        torch_top,
        torch_top,
        4, 6, 4,
        6, 2, 11, 1
      )
    ]);
  }

  get _rotation() {
    return spin(this);
  }

  get _texture() {
    return DEFAULT_TRANSPARENT;
  }
}