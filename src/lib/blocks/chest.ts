import * as THREE from "three";
import { Block, BlockClass, spin, texturedCube } from "./block";
import * as textures from '../textures/index';
import { checkExhaustive } from "../util";

@BlockClass
export class Chest extends Block {
  'facing': 'east' | 'north' | 'south' | 'west' = 'north';
  'type': 'single' | 'left' | 'right' = 'single';
  'waterlogged' = false;

  get _model(): THREE.BufferGeometry {
    const type = this['type'];
    if (type === 'single') {
      return THREE.BufferGeometryUtils.mergeBufferGeometries([
        texturedCube(
          textures.chest_side,
          textures.chest_side,
          textures.chest_front,
          textures.chest_side,
          textures.chest_top,
          textures.chest_top,
          14, 14, 14,
          1, 0, 1
        )
      ]);
    } else if (type === 'left') {
      return texturedCube(
        textures.chest_right_back,
        textures.empty,
        textures.chest_left,
        textures.chest_side,
        textures.chest_left_top,
        textures.chest_left_top,
        15, 14, 14,
        1, 0, 1
      );
    } else if (type === 'right') {
      return texturedCube(
        textures.chest_left_back,
        textures.chest_side,
        textures.chest_right,
        textures.empty,
        textures.chest_right_top,
        textures.chest_right_top,
        15, 14, 14,
        0, 0, 1
      );
    }

    return checkExhaustive(type);
  }

  get _rotation(): THREE.Euler {
    return spin(this);
  }
}