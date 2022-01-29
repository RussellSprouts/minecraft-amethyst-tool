import { Block, BlockClass, singleTexturedCube } from "./block";
import * as textures from '../../textures/index';

@BlockClass
export class RedstoneLamp extends Block {
  'lit' = false;

  get _model() {
    return this['lit'] ? singleTexturedCube(textures.redstone_lamp_lit)
      : singleTexturedCube(textures.redstone_lamp_off);
  }
}