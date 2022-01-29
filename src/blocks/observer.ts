import { Block, BlockClass, rotate, texturedCube } from "./block";
import * as textures from '../../textures/index';

@BlockClass
export class Observer extends Block {
  'facing': 'up' | 'down' | 'east' | 'north' | 'south' | 'west' = 'south';
  'powered' = false;

  get _model() {
    return texturedCube(
      textures.observer_arrow,
      textures.observer_side,
      textures.observer_arrow,
      textures.observer_side,
      textures.observer_face,
      textures.observer_back,
    );
  }

  get _rotation() {
    return rotate(this);
  }
}