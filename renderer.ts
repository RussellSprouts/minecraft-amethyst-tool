import * as THREE from 'three';
import { p, parseP, Point, SchematicWriter } from './litematic';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as textures from './textures/index';

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

const cubeIndices = new Uint16Array([
  0, 1, 2, 2, 1, 3,  // front
  4, 5, 6, 6, 5, 7,  // right
  8, 9, 10, 10, 9, 11,  // back
  12, 13, 14, 14, 13, 15,  // left
  16, 17, 18, 18, 17, 19,  // top
  20, 21, 22, 22, 21, 23,  // bottom
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
 */
function texturedCube(
  ...faces: [
    south: number,
    east: number,
    north: number,
    west: number,
    up: number,
    down: number]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',
    new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal',
    new THREE.BufferAttribute(normals, 3));

  const newUvs = new Float32Array(uvs);
  for (let i = 0; i < newUvs.length; i += 2) {
    const face = faces[Math.floor(i / 8)];
    const uvStart = face / textures.nImages;
    const uvEnd = (face + 1) / textures.nImages;
    newUvs[i] = newUvs[i] ? uvEnd : uvStart;
  }

  geometry.setAttribute('uv',
    new THREE.BufferAttribute(newUvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(cubeIndices, 1));
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

const TEXTURES: Record<string, THREE.Material | THREE.Material[] | undefined> = {
  'minecraft:budding_amethyst': singleColorMaterial('purple'),
  'minecraft:slime_block': new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, opacity: 0.75 }),
  'minecraft:scaffolding': new THREE.MeshStandardMaterial({ map: spriteSheet, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 }),
  'minecraft:calcite': singleColorMaterial('#aaa'),
  'minecraft:smooth_basalt': singleColorMaterial('#333'),
  'minecraft:amethyst_block': singleColorMaterial('#bf40bf'),
  'minecraft:stone_button': singleColorMaterial('#888'),
  'default': new THREE.MeshStandardMaterial({ map: spriteSheet }),
};

const MODELS: Record<string, THREE.BufferGeometry> = {
  'default': new THREE.BoxGeometry(1, 1, 1),
  'minecraft:stone_button':
    new THREE.BoxGeometry(6 / 16, 2 / 16, 4 / 16)
      .translate(0, -7 / 16, 0),
  'minecraft:sticky_piston': texturedCube(
    textures.sticky_piston_side,
    textures.sticky_piston_side,
    textures.sticky_piston_side,
    textures.sticky_piston_side,
    textures.sticky_piston_face,
    textures.piston_back,
  ),
  'minecraft:piston': texturedCube(
    textures.piston_side,
    textures.piston_side,
    textures.piston_side,
    textures.piston_side,
    textures.piston_face,
    textures.piston_back,
  ),
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
  'minecraft:note_block': singleTexturedCube(textures.note_block),
  'minecraft:redstone_lamp': singleTexturedCube(textures.redstone_lamp_off),
  'minecraft:redstone_lamp[lit=true]': singleTexturedCube(textures.redstone_lamp_lit),
  'minecraft:redstone_block': singleTexturedCube(textures.redstone_block),
  'minecraft:slime_block': singleTexturedCube(textures.slime_block),
  'minecraft:obsidian': singleTexturedCube(textures.obsidian),
};

const ROTATE_UP = new THREE.Euler(0, 0, 0);
const ROTATE_DOWN = new THREE.Euler(Math.PI, 0, 0)
const ROTATE_NORTH = new THREE.Euler(-Math.PI / 2, 0, 0);
const ROTATE_SOUTH = new THREE.Euler(-Math.PI / 2, 0, Math.PI);
const ROTATE_EAST = new THREE.Euler(-Math.PI / 2, 0, -Math.PI / 2);
const ROTATE_WEST = new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2);

function generateRotations(block: string): Record<string, THREE.Euler> {
  return {
    [`${block}[facing=up]`]: ROTATE_UP,
    [`${block}[facing=down]`]: ROTATE_DOWN,
    [`${block}[facing=north]`]: ROTATE_NORTH,
    [`${block}[facing=south]`]: ROTATE_SOUTH,
    [`${block}[facing=east]`]: ROTATE_EAST,
    [`${block}[facing=west]`]: ROTATE_WEST,
  }
}

const ROTATIONS: Record<string, THREE.Euler> = {
  'default': ROTATE_UP,
  ...generateRotations('minecraft:observer'),
  ...generateRotations('minecraft:sticky_piston'),
  ...generateRotations('minecraft:piston'),
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

  constructor(cssQuery: string) {
    const canvas = document.querySelector(cssQuery) as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('lightblue');

    scene.add(new THREE.Mesh(texturedCube(
      textures.sticky_piston_side,
      textures.sticky_piston_side,
      textures.sticky_piston_side,
      textures.sticky_piston_side,
      textures.sticky_piston_face,
      textures.piston_back,
    ), new THREE.MeshStandardMaterial({ map: spriteSheet })));

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
      if (blockState !== 'minecraft:air') {
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