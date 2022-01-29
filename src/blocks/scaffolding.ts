
import { Block, BlockClass, spriteSheet, texturedCube } from "./block";
import * as textures from '../../textures/index';
import * as THREE from 'three';

@BlockClass
export class Scaffolding extends Block {
  'bottom' = false;
  'distance': 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 = 7;
  'waterlogged' = false;

  get _model() {
    return texturedCube(
      textures.scaffolding_side,
      textures.scaffolding_side,
      textures.scaffolding_side,
      textures.scaffolding_side,
      textures.scaffolding_top,
      this['bottom'] ? textures.scaffolding_top : textures.empty
    );
  }

  get _texture() {
    return new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });
  }
}