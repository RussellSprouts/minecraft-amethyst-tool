import * as THREE from 'three';
import { SchematicWriter } from './litematic';
import { Point, p, parseP } from './point';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as textures from '../textures/index';
import { getBlockInfo } from './blocks/index';
import { assertInstanceOf } from './util';

const spriteSheet = new THREE.TextureLoader().load(textures.image);
spriteSheet.minFilter = THREE.NearestFilter;
spriteSheet.magFilter = THREE.NearestFilter;

export class Renderer extends EventTarget {
  allBlockStates: Record<Point, string | undefined> = {};
  allBlocks: Record<Point, THREE.Mesh | undefined> = {};

  renderRequested = false;
  renderer: THREE.Renderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  directionalLightY: THREE.DirectionalLight;
  directionalLightPlusX: THREE.DirectionalLight;
  directionalLightMinusX: THREE.DirectionalLight;
  directionalLightPlusZ: THREE.DirectionalLight;
  directionalLightMinusZ: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  inView = true;
  intersectionObserver: IntersectionObserver;

  constructor(cssQuery: string | HTMLCanvasElement) {
    super();
    const canvas = typeof cssQuery === 'string'
      ? assertInstanceOf(document.querySelector(cssQuery), HTMLCanvasElement)
      : cssQuery;

    this.intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        this.inView = entry.isIntersecting;
      }
    });
    this.intersectionObserver.observe(canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.mouse = new THREE.Vector2();
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
      this.requestRenderIfNotRequested();
    });
    this.raycaster = new THREE.Raycaster();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#fff');

    this.directionalLightY = new THREE.DirectionalLight(0x777777);
    this.directionalLightY.position.set(0, 1, 0);
    scene.add(this.directionalLightY);

    this.directionalLightPlusX = new THREE.DirectionalLight(0x444444);
    this.directionalLightPlusX.position.set(1, 0, 0);
    scene.add(this.directionalLightPlusX);

    this.directionalLightMinusX = new THREE.DirectionalLight(0x444444);
    this.directionalLightMinusX.position.set(-1, 0, 0);
    scene.add(this.directionalLightMinusX);

    this.directionalLightPlusZ = new THREE.DirectionalLight(0x222222);
    this.directionalLightPlusZ.position.set(0, 0, 1);
    scene.add(this.directionalLightPlusZ);

    this.directionalLightMinusZ = new THREE.DirectionalLight(0x222222);
    this.directionalLightMinusZ.position.set(0, 0, -1);
    scene.add(this.directionalLightMinusZ);

    this.ambientLight = new THREE.AmbientLight(0x888888);
    scene.add(this.ambientLight);

    this.scene = scene;

    const fov = 75;
    const aspect = 1;
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

    const handleResize = () => {
      const canvas = this.renderer.domElement;
      // look up the size the canvas is being displayed
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // adjust displayBuffer size to match
      if (canvas.width !== width || canvas.height !== height) {
        // you must pass false here or three.js sadly fights the browser
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.requestRenderIfNotRequested();
      }
    };

    controls.addEventListener('change', () => this.requestRenderIfNotRequested());
    window.addEventListener('resize', () => handleResize());
    document.querySelector('.main-panel')?.addEventListener('sl-reposition', () => handleResize());
    document.querySelector('.secondary-panel')?.addEventListener('sl-reposition', () => handleResize());
    this.render();
  }

  setBlockState(x: number, y: number, z: number, blockState: string) {
    const point = p(x, y, z);
    const block = getBlockInfo(blockState);
    if (this.allBlockStates[point] !== blockState) {
      this.allBlockStates[point] = blockState;
      this.allBlocks[point] && this.scene.remove(this.allBlocks[point]!);
      this.allBlocks[point] = undefined;
      if (blockState !== 'minecraft:air' && blockState !== 'minecraft:cave_air') {
        const newMesh = new THREE.Mesh(block._model, block._texture);
        newMesh.position.set(x, y, z);
        newMesh.setRotationFromEuler(block._rotation);
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
    if (!this.inView) {
      requestAnimationFrame(() => this.render());
      return;
    }

    this.renderRequested = false;

    if (this.resizeRendererToDisplaySize()) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children);
    for (const object of intersects) {
      const x = object.object.position.x | 0;
      const y = object.object.position.y | 0;
      const z = object.object.position.z | 0;
      this.dispatchEvent(new CustomEvent('hover', {
        detail: { x, y, z, blockState: this.getBlockState(x, y, z) }
      }));
      break;
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