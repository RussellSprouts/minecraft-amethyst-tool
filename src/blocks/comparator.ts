import { Block, BlockClass, DEFAULT_TRANSPARENT, spin, texturedCube } from "./block";
import * as textures from '../textures/index';
import * as THREE from "three";

@BlockClass
export class Comparator extends Block {
  'facing': 'east' | 'north' | 'south' | 'west' = 'north';
  'mode': 'compare' | 'subtract' = 'compare';
  'powered' = false;

  get _model() {
    const mode = this['mode'];
    const powered = this['powered'];
    const front_torch = mode === 'subtract' ? textures.repeater_torch_on : textures.repeater_torch_off;
    const front_torch_top = mode === 'subtract' ? textures.torch_top_on : textures.torch_top_off;
    const back_torch = powered ? textures.repeater_torch_on : textures.repeater_torch_off;
    const back_torch_top = powered ? textures.torch_top_on : textures.torch_top_off;

    return THREE.BufferGeometryUtils.mergeBufferGeometries([
      // comparator body
      texturedCube(
        textures.repeater_side,
        textures.repeater_side,
        textures.repeater_side,
        textures.repeater_side,
        powered ? textures.comparator_top_lit : textures.comparator_top,
        textures.repeater_bottom,
        16, 2, 16
      ),
      // front torch
      texturedCube(
        front_torch,
        front_torch,
        front_torch,
        front_torch,
        front_torch_top,
        front_torch_top,
        4, 4, 4,
        6, mode === 'subtract' ? 2 : 1, 11,
        1
      ),
      // back torches
      texturedCube(
        back_torch,
        back_torch,
        back_torch,
        back_torch,
        back_torch_top,
        back_torch_top,
        4, 6, 4,
        3, 2, 1,
        1
      ),
      texturedCube(
        back_torch,
        back_torch,
        back_torch,
        back_torch,
        back_torch_top,
        back_torch_top,
        4, 6, 4,
        9, 2, 1,
        1
      ),
    ]);
  }

  get _rotation() {
    return spin(this);
  }

  get _texture() {
    return DEFAULT_TRANSPARENT;
  }
}