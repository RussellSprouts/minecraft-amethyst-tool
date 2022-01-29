import { Block, BlockClass, DEFAULT_ROTATION, ROTATE_DOWN, ROTATE_EAST, ROTATE_NORTH, ROTATE_SOUTH, ROTATE_WEST, singleColorMaterial } from "./block";
import * as THREE from 'three';
import { checkExhaustive } from "../util";

@BlockClass
export class StoneButton extends Block {
  'face': 'ceiling' | 'floor' | 'wall' = 'wall';
  'facing': 'east' | 'north' | 'south' | 'west' = 'north';
  'powered' = false;

  get _model() {
    return new THREE.BoxGeometry(6 / 16, 2 / 16, 4 / 16)
      .translate(0, -7 / 16, 0);
  }

  get _rotation() {
    const face = this['face'];
    const facing = this['facing'];
    if (face === 'ceiling') {
      return ROTATE_DOWN;
    } else if (face === 'floor') {
      return DEFAULT_ROTATION;
    } else if (facing === 'north') {
      return ROTATE_NORTH;
    } else if (facing === 'east') {
      return ROTATE_EAST;
    } else if (facing === 'south') {
      return ROTATE_SOUTH;
    } else if (facing === 'west') {
      return ROTATE_WEST;
    }
    return checkExhaustive(facing);
  }

  get _texture() {
    return singleColorMaterial('#888');
  }
}