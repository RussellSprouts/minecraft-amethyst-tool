import { Block, BlockClass, rotate, texturedCube } from "./block";
import * as textures from '../../textures/index';

@BlockClass
export class StickyPiston extends Block {
  'extended': boolean = false;
  'facing': 'up' | 'down' | 'east' | 'north' | 'south' | 'west' = 'north';

  get _model() {
    if (this['extended']) {
      return texturedCube(
        textures.piston_side_short,
        textures.piston_side_short,
        textures.piston_side_short,
        textures.piston_side_short,
        textures.piston_face_extended,
        textures.piston_back,
        16, 12, 16
      );
    } else {
      const side = textures.sticky_piston_side;
      return texturedCube(
        side,
        side,
        side,
        side,
        textures.sticky_piston_face,
        textures.piston_back,
      );
    }
  }

  get _rotation() {
    return rotate(this);
  }
}