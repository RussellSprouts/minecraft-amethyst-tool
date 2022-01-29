import { Block, BlockClass, singleTexturedCube, spriteSheet } from "./block";
import * as textures from '../../textures/index';
import * as THREE from 'three';

@BlockClass
export class SlimeBlock extends Block {
  get _model() {
    return singleTexturedCube(textures.slime_block);
  }

  get _texture() {
    return new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, alphaTest: 0.5, opacity: 0.75 });
  }
}