import { SchematicReader, Point, IntRange, p, } from "./nbt";
import { readFile } from './file_access';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const fileSelector = document.getElementById('litematic') as HTMLInputElement;
fileSelector.addEventListener('change', async () => {
  const fileList = fileSelector.files;
  if (!fileList || fileList.length > 1) {
    throw new Error('One file at a time');
  } else if (fileList.length === 0) {
    return; // do nothing
  }

  console.log(fileList);

  const fileContents = await readFile(fileList[0]);
  const schematic = new SchematicReader(fileContents);
  main(schematic);
});

function main(schematic: SchematicReader) {
  const canvas = document.querySelector('#c') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas });

  const fov = 75;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 1000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('lightblue');

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  {
    const color = 0x888888;
    const light = new THREE.AmbientLight(color);
    scene.add(light);
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const budding_amethyst = new THREE.MeshStandardMaterial({ color: 'purple' });
  const obsidian = new THREE.MeshStandardMaterial({ color: 'black' });
  const slime = new THREE.MeshStandardMaterial(
    { color: '#0f0', opacity: 0.5, transparent: true });
  const redundant_slime = new THREE.MeshStandardMaterial(
    { color: '#0ff', opacity: 0, transparent: true });
  const unreachable = new THREE.MeshStandardMaterial(
    { color: '#f00', opacity: 0.5, transparent: true });
  const calcite = new THREE.MeshStandardMaterial({ color: '#aaa' });
  const smooth_basalt = new THREE.MeshStandardMaterial({ color: '#333' });
  const amethyst_block = new THREE.MeshStandardMaterial({ color: '#bf40bf' })

  const x_coords: Record<Point, boolean> = {};
  const y_coords: Record<Point, boolean> = {};
  const z_coords: Record<Point, boolean> = {};

  let min_bud_x = 1e100;
  let max_bud_x = -1e100;
  let min_bud_y = 1e100;
  let max_bud_y = -1e100;
  let min_bud_z = 1e100;
  let max_bud_z = -1e100;

  // Project all budding amethyst blocks onto the planes
  for (let y = 0; y < schematic.height; y++) {
    for (let z = 0; z < schematic.length; z++) {
      for (let x = 0; x < schematic.width; x++) {
        const block = schematic.getBlock(x, y, z);
        if (block === 'minecraft:budding_amethyst') {
          const mesh = new THREE.Mesh(geometry, budding_amethyst);
          mesh.position.set(x, y, z);
          scene.add(mesh);

          x_coords[p(0, y, z)] = true;
          y_coords[p(x, 0, z)] = true;
          z_coords[p(x, y, 0)] = true;

          min_bud_x = Math.min(x, min_bud_x);
          max_bud_x = Math.max(x, max_bud_x);
          min_bud_y = Math.min(y, min_bud_y);
          max_bud_y = Math.max(y, max_bud_y);
          min_bud_z = Math.min(z, min_bud_z);
          max_bud_z = Math.max(z, max_bud_z);
        } else if (block === 'minecraft:calcite') {
          const mesh = new THREE.Mesh(geometry, calcite);
          mesh.position.set(x, y, z);
          scene.add(mesh);
        } else if (block === 'minecraft:smooth_basalt') {
          const mesh = new THREE.Mesh(geometry, smooth_basalt);
          mesh.position.set(x, y, z);
          scene.add(mesh);
        } else if (block === 'minecraft:amethyst_block') {
          const mesh = new THREE.Mesh(geometry, amethyst_block);
          mesh.position.set(x, y, z);
          scene.add(mesh);
        }
      }
    }
  }

  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(-5, max_bud_y + 5, -5);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(
    (min_bud_x + max_bud_x) / 2,
    (min_bud_y + max_bud_y) / 2,
    (min_bud_z + max_bud_z) / 2);
  controls.update();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 20;

  console.log('EXTENTS:', 'x:', min_bud_x, max_bud_x, 'y:', min_bud_y, max_bud_y, 'z:', min_bud_z, max_bud_z);

  console.log(x_coords, y_coords, z_coords);
  const x_slime: Record<Point, boolean> = {};
  const y_slime: Record<Point, boolean> = {};
  const z_slime: Record<Point, boolean> = {};

  // Display the projected planes, and find the blocks which should be part of
  // the sweepers
  let pattern = '';
  for (const x of new IntRange(min_bud_x, max_bud_x + 1).expand(1)) {
    for (const z of new IntRange(min_bud_z, max_bud_z + 1).expand(1)) {
      if (y_coords[p(x, 0, z)]) {
        pattern += '#';
        // const mesh = new THREE.Mesh(geometry, obsidian);
        // mesh.position.set(x, max_bud_y + 3, z);
        // scene.add(mesh);
      } else if (
        y_coords[p(x - 1, 0, z)] || y_coords[p(x + 1, 0, z)] ||
        y_coords[p(x, 0, z - 1)] || y_coords[p(x, 0, z + 1)]) {
        y_slime[p(x, 0, z)] = true;
        pattern += '.';
      } else {
        pattern += ' ';
      }
    }
    pattern += '\n';
  }
  console.log('y', pattern);

  pattern = '';
  for (const y of new IntRange(min_bud_y, max_bud_y + 1).expand(1)) {
    for (const z of new IntRange(min_bud_z, max_bud_z + 1).expand(1)) {
      if (x_coords[p(0, y, z)]) {
        pattern += '#';
        // const mesh = new THREE.Mesh(geometry, obsidian);
        // mesh.position.set(max_bud_x + 3, y, z);
        // scene.add(mesh);
      } else if (
        x_coords[p(0, y - 1, z)] || x_coords[p(0, y + 1, z)] ||
        x_coords[p(0, y, z - 1)] || x_coords[p(0, y, z + 1)]) {
        x_slime[p(0, y, z)] = true;
        pattern += '.';
      } else {
        pattern += ' ';
      }
    }
    pattern += '\n';
  }
  console.log('x', pattern);

  pattern = '';
  for (const x of new IntRange(min_bud_x, max_bud_x + 1).expand(1)) {
    for (const y of new IntRange(min_bud_y, max_bud_y + 1).expand(1)) {
      if (z_coords[p(x, y, 0)]) {
        pattern += '#';
        // const mesh = new THREE.Mesh(geometry, obsidian);
        // mesh.position.set(x, y, max_bud_z + 3);
        // scene.add(mesh);
      } else if (
        z_coords[p(x - 1, y, 0)] || z_coords[p(x + 1, y, 0)] ||
        z_coords[p(x, y - 1, 0)] || z_coords[p(x, y + 1, 0)]) {
        z_slime[p(x, y, 0)] = true;
        pattern += '.';
      } else {
        pattern += ' ';
      }
    }
    pattern += '\n';
  }
  console.log('z', pattern);

  const faces = [
    [+1, 0, 0],
    [-1, 0, 0],
    [0, +1, 0],
    [0, -1, 0],
    [0, 0, +1],
    [0, 0, -1],
  ];

  const all_faces: Record<Point, boolean> = {};
  const accessible_faces: Record<Point, boolean> = {};
  const unreachable_faces: Record<Point, boolean> = {};
  // find out how many faces there are, and which are are accessible.
  for (let y = 0; y < schematic.height; y++) {
    for (let z = 0; z < schematic.length; z++) {
      for (let x = 0; x < schematic.width; x++) {
        if (schematic.getBlock(x, y, z) === 'minecraft:budding_amethyst') {
          for (const [dx, dy, dz] of faces) {
            const xx = x + dx;
            const yy = y + dy;
            const zz = z + dz;
            if (schematic.getBlock(xx, yy, zz) !== 'minecraft:budding_amethyst') {
              const key = p(xx, yy, zz);
              all_faces[key] = true;

              if (x_slime[p(0, yy, zz)] || y_slime[p(xx, 0, zz)] ||
                z_slime[p(xx, yy, 0)]) {
                accessible_faces[key] = true;
              } else {
                unreachable_faces[key] = true;
              }
            }
          }
        }
      }
    }
  }

  const n_all_faces = Object.keys(all_faces).length;
  const n_accessible_faces = Object.keys(accessible_faces).length;
  const n_unreachable_faces = Object.keys(unreachable_faces).length;
  console.log('TOTAL FACES EXPOSED: ', n_all_faces);
  console.log('ACCESSIBLE FACES: ', n_accessible_faces);
  console.log('UNREACHABLE FACES: ', n_unreachable_faces);
  console.log(
    'THEORETICAL MAX EFFICIENCY: ',
    percent(n_accessible_faces / n_all_faces));


  for (const unreachable_block of Object.keys(unreachable_faces)) {
    const [x, y, z] = unreachable_block.split(/:/g).map(v => +v);
    // const mesh = new THREE.Mesh(geometry, unreachable);
    // mesh.position.set(x, y, z);
    // scene.add(mesh);
  }

  // Remove redundant slime blocks -- ones that
  // are already handled by another axis sweeper.
  // Assign them to x first, then z, and finally y.
  // This makes the required blocks on y smaller.
  // Then, figure out the flying machine layout
  // in reverse order, removing blocks now made redundant
  // by the set flying machines.
  const x_slime_used: Record<Point, boolean> = {};
  const y_slime_used: Record<Point, boolean> = {};
  const z_slime_used: Record<Point, boolean> = {};
  for (const block of Object.keys(accessible_faces)) {
    const [x, y, z] = block.split(/:/g).map(v => +v);
    if (x_slime[p(0, y, z)]) {
      x_slime_used[p(0, y, z)] = true;
    } else if (z_slime[p(x, y, 0)]) {
      z_slime_used[p(x, y, 0)] = true;
    } else if (y_slime[p(x, 0, z)]) {
      y_slime_used[p(x, 0, z)] = true;
    }
  }

  for (const block of Object.keys(x_slime) as Point[]) {
    const [_x, y, z] = block.split(/:/g).map(v => +v);
    // const mesh = new THREE.Mesh(geometry, x_slime_used[block] ? slime : redundant_slime);
    // mesh.position.set(max_bud_x + 3, y, z);
    // scene.add(mesh);
  }

  for (const block of Object.keys(y_slime) as Point[]) {
    const [x, _y, z] = block.split(/:/g).map(v => +v);
    // const mesh = new THREE.Mesh(geometry, y_slime_used[block] ? slime : redundant_slime);
    // mesh.position.set(x, max_bud_y + 3, z);
    // scene.add(mesh);
  }

  for (const block of Object.keys(z_slime) as Point[]) {
    const [x, y, _z] = block.split(/:/g).map(v => +v);
    // const mesh = new THREE.Mesh(geometry, z_slime_used[block] ? slime : redundant_slime);
    // mesh.position.set(x, y, max_bud_z + 3);
    // scene.add(mesh);
  }

  const colors = [
    "#003f5c",
    "#2f4b7c",
    "#665191",
    "#a05195",
    "#d45087",
    "#f95d6a",
    "#ff7c43",
    "#ffa600"
  ];
  const controllers: Record<Point, ButtonController> = {};
  class ButtonController {
    n = 0;
    color = 0;

    constructor(public a: number, public b: number, public type: string, public div: HTMLElement) {
      this.type = type;
      this.div = div;
      this.div.classList.add('block', type);
      this.div.addEventListener('click', (e) => this.onClick(e));
      this.div.style.top = `${(max_bud_y - a + 1) * 32}px`;
      this.div.style.left = `${(b - min_bud_z + 1) * 32}px`;
      this.setNeighbors(false, false, false, false);
    }

    onClick(e: Event) {
      this.div.classList.toggle(this.type);
      if (this.type === 'air') {
        this.type = 'extra-slime';
      } else if (this.type === 'extra-slime') {
        this.type = 'air';
      } else if (this.type === 'slime') {
        this.type = 'regular';
      } else if (this.type === 'regular') {
        this.type = 'slime';
      }
      this.div.classList.toggle(this.type);
      updateModel(controllers);
    }

    setNeighbors(top: boolean, bottom: boolean, left: boolean, right: boolean) {
      const style = '4px solid';
      this.div.style.borderTop = top ? 'none' : style;
      this.div.style.borderBottom = bottom ? 'none' : style;
      this.div.style.borderLeft = left ? 'none' : style;
      this.div.style.borderRight = right ? 'none' : style;
      this.div.style.borderColor = colors[(this.color ?? 0) % colors.length];
    }

    setColor(color_n: number) {
      this.color = color_n;
      this.div.style.borderColor = colors[color_n % colors.length];
    }

    setN(n: number) {
      this.n = n;
      if (n > 0) {
        this.div.innerText = String(n);
      } else {
        this.div.innerText = '';
      }
      this.div.classList.toggle('invalid', n > 12);
    }

    setInvalid(value: boolean) {
      this.div.classList.toggle('invalid', value);
    }
  }
  const x_holder = document.querySelector('.x-axis') as HTMLElement;
  x_holder.style.height = `${(max_bud_y - min_bud_y + 3) * 32}px`
  x_holder.style.width = `${(max_bud_z - min_bud_z + 3) * 32}px`
  for (const y of new IntRange(min_bud_y, max_bud_y + 1).expand(1).reverse()) {
    for (const z of new IntRange(min_bud_z, max_bud_z + 1).expand(1)) {
      const div = document.createElement('div');
      x_holder.appendChild(div);
      const index = p(0, y, z);
      if (x_slime_used[index]) {
        controllers[index] = new ButtonController(y, z, 'slime', div);
      } else if (x_coords[index]) {
        controllers[index] = new ButtonController(y, z, 'obsidian', div);
      } else {
        controllers[index] = new ButtonController(y, z, 'air', div);
      }
    }
    x_holder.appendChild(document.createElement('br'));
  }

  updateModel(controllers);

  function connectsToSlime(controller: ButtonController) {
    if (!controller) return false;
    return controller.type === 'slime' || controller.type === 'regular' || controller.type === 'extra-slime';
  }

  function connectsToRegular(controller: ButtonController) {
    if (!controller) return false;
    return controller.type === 'slime' || controller.type === 'extra-slime';
  }

  function updateModel(controllers: Record<Point, ButtonController>) {
    let currentColor = 0;
    const alreadyFloodFilled: Record<Point, boolean> = {};
    for (const y of new IntRange(min_bud_y, max_bud_y + 1).expand(1).reverse()) {
      for (const z of new IntRange(min_bud_z, max_bud_z + 1).expand(1)) {
        const index = p(0, y, z);
        controllers[index].setInvalid(false);
        if (!alreadyFloodFilled[index]) {
          floodFill(y, z, 1, currentColor);
          currentColor = currentColor + 1;
        }
        if (controllers[index].type === 'slime' || controllers[index].type === 'extra-slime') {
          controllers[index].setNeighbors(
            connectsToSlime(controllers[p(0, y + 1, z)]),
            connectsToSlime(controllers[p(0, y - 1, z)]),
            connectsToSlime(controllers[p(0, y, z - 1)]),
            connectsToSlime(controllers[p(0, y, z + 1)]));
        } else if (controllers[index].type === 'regular') {
          controllers[index].setNeighbors(
            connectsToRegular(controllers[p(0, y + 1, z)]),
            connectsToRegular(controllers[p(0, y - 1, z)]),
            connectsToRegular(controllers[p(0, y, z - 1)]),
            connectsToRegular(controllers[p(0, y, z + 1)]));
        } else {
          controllers[index].setNeighbors(true, true, true, true);
        }
      }
    }
    for (const y of new IntRange(min_bud_y, max_bud_y + 1).expand(1).reverse()) {
      for (const z of new IntRange(min_bud_z, max_bud_z + 1).expand(1)) {
        const index = p(0, y, z);
        // detect places where a regular block is touching the slime block of a different machine
        if (controllers[index].type === 'regular') {
          if (controllers[p(0, y + 1, z)] && connectsToRegular(controllers[p(0, y + 1, z)]) && controllers[p(0, y + 1, z)].color !== controllers[index].color
            || controllers[p(0, y - 1, z)] && connectsToRegular(controllers[p(0, y - 1, z)]) && controllers[p(0, y - 1, z)].color !== controllers[index].color
            || controllers[p(0, y, z + 1)] && connectsToRegular(controllers[p(0, y, z + 1)]) && controllers[p(0, y, z + 1)].color !== controllers[index].color
            || controllers[p(0, y, z - 1)] && connectsToRegular(controllers[p(0, y, z - 1)]) && controllers[p(0, y, z - 1)].color !== controllers[index].color) {
            controllers[index].setInvalid(true);
          }
        }
      }
    }

    function floodFill(y: number, z: number, n: number, color: number) {
      const index = p(0, y, z);
      if (alreadyFloodFilled[index]) {
        return 0;
      }
      alreadyFloodFilled[index] = true;

      const controller = controllers[index];
      if (!controller) {
        return 0;
      }

      if (n === 1 && controller.type === 'regular') {
        // don't process regular blocks if they are first.
        alreadyFloodFilled[index] = false;
        return 0;
      }

      let total_number = 1;
      if (controller.type === 'slime' || controller.type === 'extra-slime') {
        total_number += floodFill(y + 1, z, n + 1, color);
        total_number += floodFill(y - 1, z, n + 1, color);
        total_number += floodFill(y, z + 1, n + 1, color);
        total_number += floodFill(y, z - 1, n + 1, color);
      }

      controller.setN(0);
      if (controller.type === 'slime' || controller.type === 'regular' || controller.type === 'extra-slime') {
        if (n === 1) {
          controller.setN(total_number);
        }
        controller.setColor(color);
        return total_number;
      }
      return 0;
    }
  }

  // The problem of generating the flying machines:
  // 1. Start with all slime blocks initialized as regular blocks
  // 2. For each possible position of a flying machine, expand outward by converting
  //    blocks to slime until you reach push limit.

  const random_tick_speed = 3;
  const blocks_per_subchunk = 16 * 16 * 16;
  const avg_ticks_between_random_ticks =
    blocks_per_subchunk / random_tick_speed;
  const budding_amethyst_chance_to_tick = 0.2;
  const faces_per_amethyst = 6;
  const expected_ticks_for_one_stage = avg_ticks_between_random_ticks /
    budding_amethyst_chance_to_tick * faces_per_amethyst;
  console.log(
    'EXPECTED TICKS FOR ONE STAGE OF GROWTH', expected_ticks_for_one_stage);
  const optimal_time = 167 * 60 * 20;

  console.log('TICKS BETWEEN HARVESTS', optimal_time);
  const chance_0 = binomial(0, optimal_time, 1 / expected_ticks_for_one_stage);
  const chance_1 = binomial(1, optimal_time, 1 / expected_ticks_for_one_stage);
  const chance_2 = binomial(2, optimal_time, 1 / expected_ticks_for_one_stage);
  const chance_3 = binomial(3, optimal_time, 1 / expected_ticks_for_one_stage);
  const chance_at_least_4 = 1 - chance_0 - chance_1 - chance_2 - chance_3;

  console.log(
    'PROBABILITIES:', 'k=0:', chance_0, 'k=1:', chance_1, 'k=2:', chance_2,
    'k=3:', chance_3, 'k>=4:', chance_at_least_4);

  const shards_dropped_when_broken = 2;
  const expected_shards_per_harvest =
    chance_at_least_4 * n_accessible_faces * shards_dropped_when_broken;

  console.log('EXPECTED SHARDS PER HARVEST', expected_shards_per_harvest);

  const expected_shards_per_hour =
    expected_shards_per_harvest / optimal_time * 60 * 60 * 20;

  console.log('EXPECTED SHARDS PER HOUR', expected_shards_per_hour);

  function binomial(k: number, n: number, p: number) {
    return combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  function combination(n: number, k: number) {
    if (n == k) {
      return 1;
    }
    k = k < n - k ? n - k : k;
    return Number(product_range(k + 1, n) / product_range(1, n - k));
  }

  function product_range(a: number | bigint, b: number | bigint): bigint {
    a = BigInt(a);
    b = BigInt(b);
    let product = 1n;
    for (let i = a; i <= b; i++) {
      product *= i;
    }
    return product;
  }

  function percent(p: number) {
    return `${Math.round((p * 100) * 100) / 100}% `;
  }

  function resizeRendererToDisplaySize(renderer: THREE.Renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  let renderRequested: boolean = false;

  function render() {
    renderRequested = false;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    controls.update();
    renderer.render(scene, camera);
  }
  render();

  function requestRenderIfNotRequested() {
    if (!renderRequested) {
      renderRequested = true;
      requestAnimationFrame(render);
    }
  }

  controls.addEventListener('change', requestRenderIfNotRequested);
  window.addEventListener('resize', requestRenderIfNotRequested);
}