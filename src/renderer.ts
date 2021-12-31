import * as THREE from 'three';
import { blockState, p, parseBlockState, parseP, Point, SchematicWriter } from './litematic';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as textures from '../textures/index';

const spriteSheet = new THREE.TextureLoader().load(textures.image);
spriteSheet.minFilter = THREE.NearestFilter;
spriteSheet.magFilter = THREE.NearestFilter;

const cubeVertices = [
  // front
  { pos: [-0.5, -0.5, 0.5], norm: [0, 0, 1], uv: [0, 0], },
  { pos: [0.5, -0.5, 0.5], norm: [0, 0, 1], uv: [1, 0], },
  { pos: [-0.5, 0.5, 0.5], norm: [0, 0, 1], uv: [0, 1], },
  { pos: [0.5, 0.5, 0.5], norm: [0, 0, 1], uv: [1, 1], },
  // right
  { pos: [0.5, -0.5, 0.5], norm: [1, 0, 0], uv: [0, 0], },
  { pos: [0.5, -0.5, -0.5], norm: [1, 0, 0], uv: [1, 0], },
  { pos: [0.5, 0.5, 0.5], norm: [1, 0, 0], uv: [0, 1], },
  { pos: [0.5, 0.5, -0.5], norm: [1, 0, 0], uv: [1, 1], },
  // back
  { pos: [0.5, -0.5, -0.5], norm: [0, 0, -1], uv: [0, 0], },
  { pos: [-0.5, -0.5, -0.5], norm: [0, 0, -1], uv: [1, 0], },
  { pos: [0.5, 0.5, -0.5], norm: [0, 0, -1], uv: [0, 1], },
  { pos: [-0.5, 0.5, -0.5], norm: [0, 0, -1], uv: [1, 1], },
  // left
  { pos: [-0.5, -0.5, -0.5], norm: [-1, 0, 0], uv: [0, 0], },
  { pos: [-0.5, -0.5, 0.5], norm: [-1, 0, 0], uv: [1, 0], },
  { pos: [-0.5, 0.5, -0.5], norm: [-1, 0, 0], uv: [0, 1], },
  { pos: [-0.5, 0.5, 0.5], norm: [-1, 0, 0], uv: [1, 1], },
  // top
  { pos: [0.5, 0.5, -0.5], norm: [0, 1, 0], uv: [0, 0], },
  { pos: [-0.5, 0.5, -0.5], norm: [0, 1, 0], uv: [1, 0], },
  { pos: [0.5, 0.5, 0.5], norm: [0, 1, 0], uv: [0, 1], },
  { pos: [-0.5, 0.5, 0.5], norm: [0, 1, 0], uv: [1, 1], },
  // bottom
  { pos: [0.5, -0.5, 0.5], norm: [0, -1, 0], uv: [0, 0], },
  { pos: [-0.5, -0.5, 0.5], norm: [0, -1, 0], uv: [1, 0], },
  { pos: [0.5, -0.5, -0.5], norm: [0, -1, 0], uv: [0, 1], },
  { pos: [-0.5, -0.5, -0.5], norm: [0, -1, 0], uv: [1, 1], },
];

const indices = new Uint16Array([
  0, 1, 2, 2, 1, 3,       // front
  4, 5, 6, 6, 5, 7,       // right
  8, 9, 10, 10, 9, 11,    // back
  12, 13, 14, 14, 13, 15, // left
  16, 17, 18, 18, 17, 19, // top
  20, 21, 22, 22, 21, 23, // bottom
]);

const positionsArr: number[] = [];
const normalsArr: number[] = [];
const uvsArr: number[] = [];
for (const vertex of cubeVertices) {
  positionsArr.push(...vertex.pos);
  normalsArr.push(...vertex.norm);
  uvsArr.push(...vertex.uv);
}
const positions = new Float32Array(positionsArr);
const normals = new Float32Array(normalsArr);
const uvs = new Float32Array(uvsArr);

/**
 * Creates geometry with UV mappings to map the faces
 * to the given textures.
 * 
 * @param south the south face texture
 * @param east the east face texture
 * @param north the north face texture
 * @param west the west face texture
 * @param up the up face texture
 * @param down the down face texture
 * @param width the width in pixels
 * @param height the height in pixels
 * @param length the length in pixels
 * @param startX the position within the block
 * @param startY the position within the block
 * @param startZ the position within the block
 * @param overlap offsets the faces inward
 */
function texturedCube(
  south: number,
  east: number,
  north: number,
  west: number,
  up: number,
  down: number,
  width = 16,
  height = 16,
  length = 16,
  startX = 0,
  startY = 0,
  startZ = 0,
  overlap = 0,
): THREE.BufferGeometry {
  const faces = [
    south,
    east,
    north,
    west,
    up,
    down,
  ];
  const geometry = new THREE.BufferGeometry();
  if (width === 16 && height === 16 && length === 16 && overlap === 0) {
    geometry.setAttribute('position',
      new THREE.BufferAttribute(positions, 3));
  } else {
    const newPositions = new Float32Array(positions);
    for (let i = 0; i < newPositions.length; i += 3) {
      newPositions[i] = (startX - normals[i] * overlap + (newPositions[i] > 0 ? width : 0)) / 16 - 0.5;
      newPositions[i + 1] = (startY - normals[i + 1] * overlap + (newPositions[i + 1] > 0 ? height : 0)) / 16 - 0.5;
      newPositions[i + 2] = (startZ - normals[i + 2] * overlap + (newPositions[i + 2] > 0 ? length : 0)) / 16 - 0.5;
    }
    geometry.setAttribute('position',
      new THREE.BufferAttribute(newPositions, 3));
  }
  geometry.setAttribute('normal',
    new THREE.BufferAttribute(normals, 3));

  const sizes = [
    [width, height],
    [length, height],
    [width, height],
    [length, height],
    [width, length],
    [width, length]
  ];

  const newUvs = new Float32Array(uvs);
  for (let i = 0; i < newUvs.length; i += 2) {
    const faceIndex = Math.floor(i / 8);
    const face = faces[faceIndex];
    const [textureWidth, textureHeight] = sizes[faceIndex];
    const uvStartX = 0;
    const uvEndX = textureWidth / 16;
    const uvStartY = (textures.nImages - face - textureHeight / 16) / textures.nImages;
    const uvEndY = (textures.nImages - face) / textures.nImages;
    newUvs[i] = newUvs[i] ? uvEndX : uvStartX; // x
    newUvs[i + 1] = newUvs[i + 1] ? uvEndY : uvStartY; // y
  }

  geometry.setAttribute('uv',
    new THREE.BufferAttribute(newUvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

function singleTexturedCube(face: number) {
  return texturedCube(face, face, face, face, face, face);
}

function singleColorMaterial(color: string, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    opacity,
    transparent: opacity !== 1
  });
}

function hopperGeometry(facingSide: boolean) {
  return THREE.BufferGeometryUtils.mergeBufferGeometries([
    texturedCube(
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      2, 6, 16,
      0, 10, 0
    ),
    texturedCube(
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      2, 6, 16,
      14, 10, 0
    ),
    texturedCube(
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      12, 6, 2,
      2, 10, 14
    ),
    texturedCube(
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      12, 6, 2,
      2, 10, 0
    ),
    texturedCube(
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      12, 1, 12,
      2, 10, 2
    ),
    texturedCube(
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      8, 6, 8,
      4, 4, 4
    ),
    texturedCube(
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      textures.empty,
      4, 4, 4,
      ...facingSide ? [6, 4, 0] : [6, 0, 6]
    ),
  ]);
}

function repeaterGeometry(ticks: 1 | 2 | 3 | 4, powered: boolean): THREE.BufferGeometry {
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

function comparatorGeometry(mode: 'compare' | 'subtract', powered: boolean): THREE.BufferGeometry {
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

function amethystShardGeometry(texture: number) {
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

function pistonGeometry(sticky: boolean, extended: boolean): THREE.BufferGeometry {
  if (extended) {
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
    const side = sticky ? textures.sticky_piston_side : textures.piston_side;
    return texturedCube(
      side,
      side,
      side,
      side,
      sticky ? textures.sticky_piston_face : textures.piston_face,
      textures.piston_back,
    );
  }
}

function pistonHeadGeometry(type: 'sticky' | 'normal') {
  const head_side = type === 'sticky' ?
    textures.sticky_piston_head_side : textures.piston_head_side;
  const head_face = type === 'sticky' ?
    textures.sticky_piston_face : textures.piston_face;
  return THREE.BufferGeometryUtils.mergeBufferGeometries([
    texturedCube(
      head_side,
      head_side,
      head_side,
      head_side,
      head_face,
      head_face,
      16, 4, 16, 0, 12, 0
    ),
    texturedCube(
      textures.piston_arm,
      textures.piston_arm,
      textures.piston_arm,
      textures.piston_arm,
      textures.empty,
      textures.empty,
      4, 16, 4,
      6, -4, 6
    )
  ]);
}

function chestGeometry(type: 'left' | 'right' | 'single') {
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
}

const REDSTONE_BOTTOM_TEXTURE: Record<string, number> = {
  '': textures.redstone_dot,
  'n': textures.redstone_ns,
  's': textures.redstone_ns,
  'e': textures.redstone_ew,
  'w': textures.redstone_ew,
  'ns': textures.redstone_ns,
  'ew': textures.redstone_ew,
  'nw': textures.redstone_nw,
  'ne': textures.redstone_ne,
  'se': textures.redstone_se,
  'sw': textures.redstone_sw,
  'nsw': textures.redstone_nsw,
  'new': textures.redstone_new,
  'nse': textures.redstone_nse,
  'sew': textures.redstone_sew,
  'nsew': textures.redstone_nsew,
};

type RedstoneSide = 'none' | 'side' | 'up';
function redstoneWireGeometry(north: RedstoneSide, south: RedstoneSide, east: RedstoneSide, west: RedstoneSide, power: number) {
  const poweredOffset = power === 0 ? 1 : 0;
  return texturedCube(
    south === 'up' ? poweredOffset + textures.redstone_ns : textures.empty,
    east === 'up' ? poweredOffset + textures.redstone_ns : textures.empty,
    north === 'up' ? poweredOffset + textures.redstone_ns : textures.empty,
    west === 'up' ? poweredOffset + textures.redstone_ns : textures.empty,
    textures.empty,
    REDSTONE_BOTTOM_TEXTURE[
    (north === 'none' ? '' : 'n')
    + (south === 'none' ? '' : 's')
    + (east === 'none' ? '' : 'e')
    + (west === 'none' ? '' : 'w')
    ] + poweredOffset,
    16, 16, 16, 0, 0, 0,
    0.01 // offset a tiny bit to prevent texture fighting
  )
}

const DEFAULT_TRANSPARENT = new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, alphaTest: 0.5 });

const TEXTURES: Record<string, THREE.Material | THREE.Material[] | undefined> = {
  'minecraft:slime_block': new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, alphaTest: 0.5, opacity: 0.75 }),
  'minecraft:scaffolding': new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 }),
  'minecraft:redstone_wire': new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 }),
  'minecraft:calcite': singleColorMaterial('#aaa'),
  'minecraft:smooth_basalt': singleColorMaterial('#333'),
  'minecraft:amethyst_block': singleColorMaterial('#7457a5'),
  'minecraft:stone_button': singleColorMaterial('#888'),
  'minecraft:hopper': singleColorMaterial('#333'),
  'minecraft:stone': singleColorMaterial('#777'),
  'minecraft:dirt': singleColorMaterial('#61452e'),
  'minecraft:diorite': singleColorMaterial('#aaa'),
  'minecraft:andesite': singleColorMaterial('#777'),
  'minecraft:granite': singleColorMaterial('#7f5646'),
  'minecraft:deepslate': singleColorMaterial('#333'),
  'minecraft:gravel': singleColorMaterial('#888'),
  'minecraft:iron_block': singleColorMaterial('#aaa'),
  'minecraft:repeater': DEFAULT_TRANSPARENT,
  'minecraft:comparator': DEFAULT_TRANSPARENT,
  'minecraft:small_amethyst_bud': DEFAULT_TRANSPARENT,
  'minecraft:medium_amethyst_bud': DEFAULT_TRANSPARENT,
  'minecraft:large_amethyst_bud': DEFAULT_TRANSPARENT,
  'minecraft:amethyst_cluster': DEFAULT_TRANSPARENT,
  'minecraft:water': singleColorMaterial('#00f', 0.1),
  'default': new THREE.MeshStandardMaterial({ map: spriteSheet }),
};

const MODELS: Record<string, THREE.BufferGeometry> = {
  'default': singleTexturedCube(textures.missing),
  'minecraft:stone_button':
    new THREE.BoxGeometry(6 / 16, 2 / 16, 4 / 16)
      .translate(0, -7 / 16, 0),
  ...Object.fromEntries(
    ['north', 'south', 'east', 'west', 'up', 'down'].flatMap(facing =>
      ['sticky_', ''].flatMap(sticky =>
        [true, false].map(extended =>
          [
            `minecraft:${sticky}piston[extended=${extended},facing=${facing}]`,
            pistonGeometry(!!sticky, extended)
          ])))),
  ...Object.fromEntries(
    ['north', 'south', 'east', 'west', 'up', 'down'].flatMap(facing =>
      (['sticky', 'normal'] as const).flatMap(type =>
        [true, false].map(short =>
          [
            `minecraft:piston_head[facing=${facing},short=${short},type=${type}]`,
            pistonHeadGeometry(type)
          ])))),
  'minecraft:observer': texturedCube(
    textures.observer_arrow,
    textures.observer_side,
    textures.observer_arrow,
    textures.observer_side,
    textures.observer_face,
    textures.observer_back,
  ),
  'minecraft:scaffolding[bottom=true]': texturedCube(
    textures.scaffolding_side,
    textures.scaffolding_side,
    textures.scaffolding_side,
    textures.scaffolding_side,
    textures.scaffolding_top,
    textures.scaffolding_top
  ),
  'minecraft:scaffolding': texturedCube(
    textures.scaffolding_side,
    textures.scaffolding_side,
    textures.scaffolding_side,
    textures.scaffolding_side,
    textures.scaffolding_top,
    textures.empty,
  ),
  ...Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].flatMap(power =>
      (['none', 'side', 'up'] as const).flatMap(north =>
        (['none', 'side', 'up'] as const).flatMap(south =>
          (['none', 'side', 'up'] as const).flatMap(east =>
            (['none', 'side', 'up'] as const).map(west =>
              [
                `minecraft:redstone_wire[east=${east},north=${north},power=${power},south=${south},west=${west}]`,
                redstoneWireGeometry(north, south, east, west, power)
              ])))))
  ),
  ...Object.fromEntries(
    ([1, 2, 3, 4] as const).flatMap(delay =>
      [true, false].flatMap(powered => {
        const geometry = repeaterGeometry(delay, powered);
        return ['east', 'west', 'north', 'south'].flatMap(facing =>
          [true, false].map(locked => [
            `minecraft:repeater[delay=${delay},facing=${facing},locked=${locked},powered=${powered}]`,
            geometry
          ]));
      }))),
  ...Object.fromEntries(
    [true, false].flatMap(powered =>
      (['compare', 'subtract'] as const).flatMap(mode => {
        const geometry = comparatorGeometry(mode, powered);
        return ['east', 'west', 'north', 'south'].map(facing =>
          [
            `minecraft:comparator[facing=${facing},mode=${mode},powered=${powered}]`,
            geometry
          ]);
      }
      ))),
  ...Object.fromEntries(
    ['east', 'west', 'north', 'south'].flatMap(facing =>
      (['left', 'right', 'single'] as const).flatMap(type =>
        [true, false].map(waterlogged =>
          [
            `minecraft:chest[facing=${facing},type=${type},waterlogged=${waterlogged}]`,
            chestGeometry(type),
          ]
        )))),
  'minecraft:note_block': singleTexturedCube(textures.note_block),
  'minecraft:redstone_lamp': singleTexturedCube(textures.redstone_lamp_off),
  'minecraft:redstone_lamp[lit=true]': singleTexturedCube(textures.redstone_lamp_lit),
  'minecraft:redstone_block': singleTexturedCube(textures.redstone_block),
  'minecraft:slime_block': singleTexturedCube(textures.slime_block),
  'minecraft:obsidian': singleTexturedCube(textures.obsidian),
  'minecraft:budding_amethyst': singleTexturedCube(textures.budding_amethyst),
  'minecraft:hopper': hopperGeometry(true),
  'minecraft:hopper[enabled=true,facing=down]': hopperGeometry(false),
  'minecraft:hopper[enabled=false,facing=down]': hopperGeometry(false),
  'minecraft:small_amethyst_bud': amethystShardGeometry(textures.shard_1),
  'minecraft:medium_amethyst_bud': amethystShardGeometry(textures.shard_2),
  'minecraft:large_amethyst_bud': amethystShardGeometry(textures.shard_3),
  'minecraft:amethyst_cluster': amethystShardGeometry(textures.shard_4),
  'minecraft:coal_ore': singleTexturedCube(textures.coal_ore),
  'minecraft:copper_ore': singleTexturedCube(textures.copper_ore),
  'minecraft:lapis_ore': singleTexturedCube(textures.lapis_ore),
  'minecraft:iron_ore': singleTexturedCube(textures.iron_ore),
  'minecraft:redstone_ore': singleTexturedCube(textures.redstone_ore),
  'minecraft:diamond_ore': singleTexturedCube(textures.diamond_ore),
  'minecraft:gold_ore': singleTexturedCube(textures.gold_ore),
  'minecraft:emerald_ore': singleTexturedCube(textures.emerald_ore),
  'minecraft:deepslate_coal_ore': singleTexturedCube(textures.coal_ore + 1),
  'minecraft:deepslate_copper_ore': singleTexturedCube(textures.copper_ore + 1),
  'minecraft:deepslate_lapis_ore': singleTexturedCube(textures.lapis_ore + 1),
  'minecraft:deepslate_iron_ore': singleTexturedCube(textures.iron_ore + 1),
  'minecraft:deepslate_redstone_ore': singleTexturedCube(textures.redstone_ore + 1),
  'minecraft:deepslate_diamond_ore': singleTexturedCube(textures.diamond_ore + 1),
  'minecraft:deepslate_gold_ore': singleTexturedCube(textures.gold_ore + 1),
  'minecraft:deepslate_emerald_ore': singleTexturedCube(textures.emerald_ore + 1),
  'minecraft:smooth_stone': singleTexturedCube(textures.smooth_stone),
};

const DEFAULT_ROTATION = new THREE.Euler(0, 0, 0);
const ROTATE_DOWN = new THREE.Euler(Math.PI, 0, 0);
const ROTATE_NORTH = new THREE.Euler(-Math.PI / 2, 0, 0);
const ROTATE_SOUTH = new THREE.Euler(-Math.PI / 2, 0, Math.PI);
const ROTATE_EAST = new THREE.Euler(-Math.PI / 2, 0, -Math.PI / 2);
const ROTATE_WEST = new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2);
const SPIN_WEST = new THREE.Euler(0, Math.PI / 2, 0);
const SPIN_SOUTH = new THREE.Euler(0, Math.PI, 0);
const SPIN_EAST = new THREE.Euler(0, -Math.PI / 2, 0);

function addProperties(block: string, properties: Record<string, string>): string {
  const bs = parseBlockState(block);
  return blockState({
    'Name': bs['Name'],
    'Properties': {
      ...bs['Properties'],
      ...properties
    }
  });
}

/**
 * Generates versions of the block that are rotated around
 * the y axis to face different directions.
 * 
 * e.g. repeaters, furnaces
 */
function generateSpins(block: string): Record<string, THREE.Euler> {
  return {
    [addProperties(block, { 'facing': 'north' })]: DEFAULT_ROTATION,
    [addProperties(block, { 'facing': 'south' })]: SPIN_SOUTH,
    [addProperties(block, { 'facing': 'east' })]: SPIN_EAST,
    [addProperties(block, { 'facing': 'west' })]: SPIN_WEST,
  }
}

/**
 * Generates 6 versions of the block that are oriented
 * in each direction.
 * 
 * e.g. pistons, observers
 */
function generateRotations(block: string): Record<string, THREE.Euler> {
  return {
    [addProperties(block, { 'facing': 'up' })]: DEFAULT_ROTATION,
    [addProperties(block, { 'facing': 'down' })]: ROTATE_DOWN,
    [addProperties(block, { 'facing': 'north' })]: ROTATE_NORTH,
    [addProperties(block, { 'facing': 'south' })]: ROTATE_SOUTH,
    [addProperties(block, { 'facing': 'east' })]: ROTATE_EAST,
    [addProperties(block, { 'facing': 'west' })]: ROTATE_WEST,
  };
}

const ROTATIONS: Record<string, THREE.Euler> = {
  'default': DEFAULT_ROTATION,
  ...generateRotations('minecraft:observer[powered=false]'),
  ...generateRotations('minecraft:observer[powered=true]'),
  ...generateRotations('minecraft:sticky_piston[extended=false]'),
  ...generateRotations('minecraft:sticky_piston[extended=true]'),
  ...generateRotations('minecraft:piston_head[short=true,type=sticky]'),
  ...generateRotations('minecraft:piston_head[short=false,type=sticky]'),
  ...generateRotations('minecraft:piston_head[short=true,type=normal]'),
  ...generateRotations('minecraft:piston_head[short=false,type=normal]'),
  ...generateRotations('minecraft:piston[extended=false]'),
  ...generateRotations('minecraft:piston[extended=true]'),
  ...generateRotations('minecraft:small_amethyst_bud[waterlogged=true]'),
  ...generateRotations('minecraft:small_amethyst_bud[waterlogged=false]'),
  ...generateRotations('minecraft:medium_amethyst_bud[waterlogged=true]'),
  ...generateRotations('minecraft:medium_amethyst_bud[waterlogged=false]'),
  ...generateRotations('minecraft:large_amethyst_bud[waterlogged=true]'),
  ...generateRotations('minecraft:large_amethyst_bud[waterlogged=false]'),
  ...generateRotations('minecraft:amethyst_cluster[waterlogged=true]'),
  ...generateRotations('minecraft:amethyst_cluster[waterlogged=false]'),

  ...Object.fromEntries(
    [1, 2, 3, 4].flatMap(delay =>
      [true, false].flatMap(locked =>
        [true, false].flatMap(powered =>
          Object.entries(
            generateSpins(`minecraft:repeater[delay=${delay},locked=${locked},powered=${powered}]`)))))),

  ...generateSpins('minecraft:chest[type=right,waterlogged=false]'),
  ...generateSpins('minecraft:chest[type=right,waterlogged=true]'),
  ...generateSpins('minecraft:chest[type=left,waterlogged=false]'),
  ...generateSpins('minecraft:chest[type=left,waterlogged=true]'),
  ...generateSpins('minecraft:chest[type=single,waterlogged=false]'),
  ...generateSpins('minecraft:chest[type=single,waterlogged=true]'),


  ...generateSpins('minecraft:comparator[mode=compare,powered=false]'),
  ...generateSpins('minecraft:comparator[mode=compare,powered=true]'),
  ...generateSpins('minecraft:comparator[mode=subtract,powered=false]'),
  ...generateSpins('minecraft:comparator[mode=subtract,powered=true]'),

  ...generateSpins('minecraft:hopper[enabled=true]'),
  ...generateSpins('minecraft:hopper[enabled=false]'),

  // buttons don't use the usual rotations, because they
  // have 4 separate rotations for floors and ceilings.
  'minecraft:stone_button[face=ceiling,facing=north]': ROTATE_DOWN,
  'minecraft:stone_button[face=wall,facing=north]': ROTATE_NORTH,
  'minecraft:stone_button[face=wall,facing=south]': ROTATE_SOUTH,
  'minecraft:stone_button[face=wall,facing=east]': ROTATE_EAST,
  'minecraft:stone_button[face=wall,facing=west]': ROTATE_WEST,
};

/**
 * Checks the property map for information about the given block state.
 * Looks for exact match block states with [properties], then checks
 * the block without properties, and otherwise returns the 'default' value
 * of the map.
 */
function getPropertyForBlock<T>(propertyMap: Record<string, T>, block: string): T {
  if (propertyMap[block]) {
    return propertyMap[block];
  }
  const propsIndex = block.indexOf('[');
  if (propsIndex !== -1) {
    return propertyMap[block.slice(0, propsIndex)] ?? propertyMap['default'];
  }
  return propertyMap['default'];
}

export class Renderer {
  allBlockStates: Record<Point, string | undefined> = {};
  allBlocks: Record<Point, THREE.Mesh | undefined> = {};

  renderRequested = false;
  renderer: THREE.Renderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  directionalLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  pointLight: THREE.PointLight;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;

  constructor(cssQuery: string) {
    const canvas = document.querySelector(cssQuery) as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.mouse = new THREE.Vector2();
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
      this.requestRenderIfNotRequested();
    });
    this.raycaster = new THREE.Raycaster();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('lightblue');

    this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    this.directionalLight.position.set(-1, 2, 4);
    scene.add(this.directionalLight);

    this.ambientLight = new THREE.AmbientLight(0x888888);
    scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight('#ffb900', 0.2, 0, 2);
    scene.add(this.pointLight);
    this.scene = scene;

    const fov = 75;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 1000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    const controls = new OrbitControls(this.camera, canvas);
    controls.update();
    controls.minDistance = 1;
    controls.maxDistance = 100;
    // controls.autoRotate = true;
    // controls.autoRotateSpeed = 20;
    this.controls = controls;

    controls.addEventListener('change', () => this.requestRenderIfNotRequested());
    window.addEventListener('resize', () => this.requestRenderIfNotRequested());
    this.render();
  }

  setBlockState(x: number, y: number, z: number, blockState: string) {
    const point = p(x, y, z);
    if (this.allBlockStates[point] !== blockState) {
      this.allBlockStates[point] = blockState;
      this.allBlocks[point] && this.scene.remove(this.allBlocks[point]!);
      this.allBlocks[point] = undefined;
      if (blockState !== 'minecraft:air' && blockState !== 'minecraft:cave_air') {
        const newMesh = new THREE.Mesh(getPropertyForBlock(MODELS, blockState), getPropertyForBlock(TEXTURES, blockState));
        newMesh.position.set(x, y, z);
        newMesh.setRotationFromEuler(getPropertyForBlock(ROTATIONS, blockState));
        this.allBlocks[point] = newMesh;
        this.scene.add(newMesh);
      }
    }
  }

  getBlockState(x: number, y: number, z: number): string {
    return this.allBlockStates[p(x, y, z)] ?? 'minecraft:air';
  }

  getBlockMesh(x: number, y: number, z: number): THREE.Mesh | undefined {
    return this.allBlocks[p(x, y, z)];
  }

  resizeRendererToDisplaySize() {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      this.renderer.setSize(width, height, false);
    }
    return needResize;
  }

  render() {
    this.renderRequested = false;

    if (this.resizeRendererToDisplaySize()) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    for (const object of this.scene.children) {
      object.visible = true;
    }
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    for (const object of intersects) {
      //object.object.visible = false;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  requestRenderIfNotRequested() {
    if (!this.renderRequested) {
      this.renderRequested = true;
      requestAnimationFrame(() => this.render());
    }
  }

  /**
   * Calls the callback nFrames times with the current frame number,
   * rendering if the callback returns true.
   */
  animate(nFrames: number, framesPerCall: number, cb: (frame: number) => boolean) {
    const that = this;
    let i = 0;
    let frame = 0;
    requestAnimationFrame(function recurse() {
      if (frame % framesPerCall === 0) {
        if (cb(i)) {
          that.requestRenderIfNotRequested();
        }
        i++;
      }
      frame++;

      if (nFrames === -1 || i < nFrames) {
        requestAnimationFrame(recurse);
      }
    });
  }

  toSchematic(): SchematicWriter {
    const writer = new SchematicWriter('schematic', 'russellsprouts');
    for (const point of Object.keys(this.allBlockStates) as Point[]) {
      const [x, y, z] = parseP(point);
      writer.setBlock(x, y, z, this.allBlockStates[point] ?? 'minecraft:air');
    }
    return writer;
  }
}