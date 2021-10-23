import * as THREE from 'three';
import { p, parseP, Point, SchematicWriter } from './litematic';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as textures from './textures/index';

const loader = new THREE.TextureLoader();

const textureCache = new Map<string, THREE.Texture>();
function load(url: string) {
  if (textureCache.has(url)) {
    return textureCache.get(url)!;
  }
  const texture = loader.load(url);
  // Ensure the textures are resized using nearest
  // neighbor filtering instead of bicubic.
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  textureCache.set(url, texture);
  return texture;
}

function cubeMaterial(
  east: string,
  west: string,
  up: string,
  down: string,
  south: string,
  north: string,): THREE.Material[] {
  return [
    new THREE.MeshStandardMaterial({ map: load(east) }),
    new THREE.MeshStandardMaterial({ map: load(west) }),
    new THREE.MeshStandardMaterial({ map: load(up) }),
    new THREE.MeshStandardMaterial({ map: load(down) }),
    new THREE.MeshStandardMaterial({ map: load(south) }),
    new THREE.MeshStandardMaterial({ map: load(north) }),
  ];
}

const TEXTURES: Record<string, THREE.Material | THREE.Material[] | undefined> = {
  'minecraft:budding_amethyst': new THREE.MeshStandardMaterial({ color: 'purple' }),
  'minecraft:obsidian': new THREE.MeshStandardMaterial({ color: '#120d1d' }),
  'minecraft:slime_block': new THREE.MeshStandardMaterial({ color: '#0f0', opacity: 0.75, transparent: true }),
  'minecraft:calcite': new THREE.MeshStandardMaterial({ color: '#aaa' }),
  'minecraft:smooth_basalt': new THREE.MeshStandardMaterial({ color: '#333' }),
  'minecraft:amethyst_block': new THREE.MeshStandardMaterial({ color: '#bf40bf' }),
  'minecraft:stone_button': new THREE.MeshStandardMaterial({ color: '#888' }),
  'minecraft:sticky_piston': cubeMaterial(
    textures.sticky_piston_side(),
    textures.sticky_piston_side(),
    textures.sticky_piston_face(),
    textures.piston_back(),
    textures.sticky_piston_side(),
    textures.sticky_piston_side()
  ),
  'minecraft:piston': cubeMaterial(
    textures.piston_side(),
    textures.piston_side(),
    textures.piston_face(),
    textures.piston_back(),
    textures.piston_side(),
    textures.piston_side()
  ),
  'minecraft:observer': cubeMaterial(
    textures.observer_side(),
    textures.observer_side(),
    textures.observer_face(),
    textures.observer_back(),
    textures.observer_arrow(),
    textures.observer_arrow()
  ),
  'minecraft:note_block': new THREE.MeshStandardMaterial({ map: load(textures.note_block()) }),
  'minecraft:redstone_lamp': new THREE.MeshStandardMaterial({ map: load(textures.redstone_lamp_off()) }),
  'minecraft:redstone_lamp[lit=true]': new THREE.MeshStandardMaterial({ map: load(textures.redstone_lamp_lit()) }),
  'default': new THREE.MeshStandardMaterial({ color: '#777' }),
};

const MODELS: Record<string, THREE.BufferGeometry> = {
  'default': new THREE.BoxGeometry(1, 1, 1),
  'minecraft:stone_button':
    new THREE.BoxGeometry(6 / 16, 2 / 16, 4 / 16)
      .translate(0, -7 / 16, 0),
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