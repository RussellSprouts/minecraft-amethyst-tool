import { Block, BlockClass, DEFAULT_TRANSPARENT, rotate, texturedCube } from "./block";
import * as THREE from 'three';
import * as textures from '../../textures/index';


@BlockClass
export class AmethystShardBase extends Block {
  'facing': 'up' | 'down' | 'east' | 'north' | 'south' | 'west' = 'north';
  'waterlogged' = false;

  _growth: number = textures.missing;

  get _model() {
    const texture = this._growth;
    return THREE.BufferGeometryUtils.mergeBufferGeometries([
      texturedCube(
        texture,
        textures.empty,
        texture,
        textures.empty,
        textures.empty,
        textures.empty,
        16, 16, 16,
        0, 0, 0,
        8
      ),
      texturedCube(
        textures.empty,
        texture,
        textures.empty,
        texture,
        textures.empty,
        textures.empty,
        16, 16, 16,
        0, 0, 0,
        8
      ),
    ]).rotateY(Math.PI / 4);
  }

  get _rotation() {
    return rotate(this);
  }

  get _texture() {
    return DEFAULT_TRANSPARENT;
  }
}

@BlockClass
export class SmallAmethystBud extends AmethystShardBase {
  _growth = textures.shard_1;
}

@BlockClass
export class MediumAmethystBud extends AmethystShardBase {
  _growth = textures.shard_2;
}

@BlockClass
export class LargeAmethystBud extends AmethystShardBase {
  _growth = textures.shard_3;
}

@BlockClass
export class AmethystCluster extends AmethystShardBase {
  _growth = textures.shard_4;
}