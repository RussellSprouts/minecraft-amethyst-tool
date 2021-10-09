import { SchematicReader, Point, IntRange, p, parseP, } from "./nbt";
import { readFile } from './file_access';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Renderer } from "./renderer";

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
  const renderer = new Renderer('#c');

  const x_coords: Record<Point, boolean> = {};
  const y_coords: Record<Point, boolean> = {};
  const z_coords: Record<Point, boolean> = {};

  let min_bud_x = 1e100;
  let max_bud_x = -1e100;
  let min_bud_y = 1e100;
  let max_bud_y = -1e100;
  let min_bud_z = 1e100;
  let max_bud_z = -1e100;

  for (let y = 0; y < schematic.height; y++) {
    for (let z = 0; z < schematic.length; z++) {
      for (let x = 0; x < schematic.width; x++) {
        const block = schematic.getBlock(x, y, z);
        if (block === 'minecraft:budding_amethyst') {
          renderer.setBlockState(x, y, z, block);

          min_bud_x = Math.min(x, min_bud_x);
          max_bud_x = Math.max(x, max_bud_x);
          min_bud_y = Math.min(y, min_bud_y);
          max_bud_y = Math.max(y, max_bud_y);
          min_bud_z = Math.min(z, min_bud_z);
          max_bud_z = Math.max(z, max_bud_z);
        }
        // else if (block === 'minecraft:calcite') {
        //   renderer.setBlockState(x, y, z, block);
        // } else if (block === 'minecraft:smooth_basalt') {
        //   renderer.setBlockState(x, y, z, block);
        // } else if (block === 'minecraft:amethyst_block') {
        //   renderer.setBlockState(x, y, z, block);
        // }
      }
    }
  }

  const fx = max_bud_x + 3;
  const fy = max_bud_y + 3;
  const fz = max_bud_z + 3;

  // Project all budding amethyst blocks onto the planes
  for (let y = 0; y < schematic.height; y++) {
    for (let z = 0; z < schematic.length; z++) {
      for (let x = 0; x < schematic.width; x++) {
        const block = schematic.getBlock(x, y, z);
        if (block === 'minecraft:budding_amethyst') {
          x_coords[p(fx, y, z)] = true;
          y_coords[p(x, fy, z)] = true;
          z_coords[p(x, y, fz)] = true;
        }
      }
    }
  }

  renderer.camera.position.set(-5, max_bud_y + 5, -5);
  const center_x = (min_bud_x + max_bud_x) / 2;
  const center_y = (min_bud_y + max_bud_y) / 2;
  const center_z = (min_bud_z + max_bud_z) / 2;
  renderer.controls.target.set(center_x, center_y, center_z);
  renderer.pointLight.position.set(center_x, center_y, center_z);
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
      if (y_coords[p(x, fy, z)]) {
        pattern += '#';
        // const mesh = new THREE.Mesh(geometry, obsidian);
        // mesh.position.set(x, max_bud_y + 3, z);
        // scene.add(mesh);
      } else if (
        y_coords[p(x - 1, fy, z)] || y_coords[p(x + 1, fy, z)] ||
        y_coords[p(x, fy, z - 1)] || y_coords[p(x, fy, z + 1)]) {
        y_slime[p(x, fy, z)] = true;
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
      if (x_coords[p(fx, y, z)]) {
        pattern += '#';
        // const mesh = new THREE.Mesh(geometry, obsidian);
        // mesh.position.set(max_bud_x + 3, y, z);
        // scene.add(mesh);
      } else if (
        x_coords[p(fx, y - 1, z)] || x_coords[p(fx, y + 1, z)] ||
        x_coords[p(fx, y, z - 1)] || x_coords[p(fx, y, z + 1)]) {
        x_slime[p(fx, y, z)] = true;
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
      if (z_coords[p(x, y, fz)]) {
        pattern += '#';
        // const mesh = new THREE.Mesh(geometry, obsidian);
        // mesh.position.set(x, y, max_bud_z + 3);
        // scene.add(mesh);
      } else if (
        z_coords[p(x - 1, y, fz)] || z_coords[p(x + 1, y, fz)] ||
        z_coords[p(x, y - 1, fz)] || z_coords[p(x, y + 1, fz)]) {
        z_slime[p(x, y, fz)] = true;
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

              if (x_slime[p(fx, yy, zz)] || y_slime[p(xx, fy, zz)] ||
                z_slime[p(xx, yy, fz)]) {
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
    renderer.setBlockState(x, y, z, 'unreachable');
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
    if (x_slime[p(fx, y, z)]) {
      x_slime_used[p(fx, y, z)] = true;
    } else if (z_slime[p(x, y, fz)]) {
      z_slime_used[p(x, y, fz)] = true;
    } else if (y_slime[p(x, fy, z)]) {
      y_slime_used[p(x, fy, z)] = true;
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

  console.log('y slime used', y_slime_used);
  create2dView(document.querySelector('.x-axis') as HTMLElement, x_slime_used, x_coords, min_bud_y, max_bud_y, min_bud_z, max_bud_z, (y, z) => p(fx, y, z));
  create2dView(document.querySelector('.y-axis') as HTMLElement, y_slime_used, y_coords, min_bud_x, max_bud_x, min_bud_z, max_bud_z, (x, z) => p(x, fy, z));
  create2dView(document.querySelector('.z-axis') as HTMLElement, z_slime_used, z_coords, min_bud_y, max_bud_y, min_bud_x, max_bud_x, (y, x) => p(x, y, fz));

  function create2dView(
    element: HTMLElement,
    slime_used: Record<Point, boolean>,
    amethyst_coords: Record<Point, boolean>,
    min_bud_a: number,
    max_bud_a: number,
    min_bud_b: number,
    max_bud_b: number,
    p: (a: number, b: number) => Point) {
    const controllers: Record<Point, ButtonController> = {};
    const container = element.querySelector('.grid') as HTMLElement;
    const machineCountContainer = element.querySelector('.count')!;

    class ButtonController {
      n = 0;
      color = 0;

      constructor(public a: number, public b: number, public type: string, public div: HTMLElement) {
        this.type = type;
        this.div = div;
        this.div.classList.add('block', type);
        this.div.addEventListener('click', (e) => this.onClick(e));
        this.div.style.top = `${(max_bud_a - a + 1) * 32}px`;
        this.div.style.left = `${(b - min_bud_b + 1) * 32}px`;
        this.setNeighbors(false, false, false, false);
      }

      onClick(e: Event) {
        this.div.classList.toggle(this.type);
        if (this.type === 'air') {
          this.type = 'extra-slime';
        } else if (this.type === 'extra-slime') {
          this.type = 'air';
          this.setN(0);
        } else if (this.type === 'slime') {
          this.type = 'regular';
        } else if (this.type === 'regular') {
          this.type = 'slime';
        }
        this.div.classList.toggle(this.type);
        updateModel(controllers);
      }

      setNeighbors(top: boolean, bottom: boolean, left: boolean, right: boolean) {
        const style = '6px solid';
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

    container.style.height = `${(max_bud_a - min_bud_a + 3) * 32}px`
    container.style.width = `${(max_bud_b - min_bud_b + 3) * 32}px`
    for (const a of new IntRange(min_bud_a, max_bud_a + 1).expand(1).reverse()) {
      for (const b of new IntRange(min_bud_b, max_bud_b + 1).expand(1)) {
        const div = document.createElement('div');
        container.appendChild(div);
        const index = p(a, b);
        if (slime_used[index]) {
          controllers[index] = new ButtonController(a, b, 'slime', div);
        } else if (amethyst_coords[index]) {
          controllers[index] = new ButtonController(a, b, 'amethyst', div);
        } else {
          controllers[index] = new ButtonController(a, b, 'air', div);
        }
      }
      container.appendChild(document.createElement('br'));
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
      for (const a of new IntRange(min_bud_a, max_bud_a + 1).expand(1).reverse()) {
        for (const b of new IntRange(min_bud_b, max_bud_b + 1).expand(1)) {
          const index = p(a, b);
          controllers[index].setInvalid(false);
          if (!alreadyFloodFilled[index] && controllers[index] && controllers[index].type !== 'air' && controllers[index].type !== 'amethyst') {
            floodFill(a, b, 1, currentColor);
            currentColor = currentColor + 1;
          }
          if (controllers[index].type === 'slime' || controllers[index].type === 'extra-slime') {
            controllers[index].setNeighbors(
              connectsToSlime(controllers[p(a + 1, b)]),
              connectsToSlime(controllers[p(a - 1, b)]),
              connectsToSlime(controllers[p(a, b - 1)]),
              connectsToSlime(controllers[p(a, b + 1)]));
          } else if (controllers[index].type === 'regular') {
            controllers[index].setNeighbors(
              connectsToRegular(controllers[p(a + 1, b)]),
              connectsToRegular(controllers[p(a - 1, b)]),
              connectsToRegular(controllers[p(a, b - 1)]),
              connectsToRegular(controllers[p(a, b + 1)]));
          } else {
            controllers[index].setNeighbors(true, true, true, true);
          }
        }
      }
      for (const a of new IntRange(min_bud_a, max_bud_a + 1).expand(1).reverse()) {
        for (const b of new IntRange(min_bud_b, max_bud_b + 1).expand(1)) {
          const index = p(a, b);
          const type = controllers[index].type;
          // detect places where a regular block is touching the slime block of a different machine
          if (type === 'regular') {
            if (controllers[p(a + 1, b)] && connectsToRegular(controllers[p(a + 1, b)]) && controllers[p(a + 1, b)].color !== controllers[index].color
              || controllers[p(a - 1, b)] && connectsToRegular(controllers[p(a - 1, b)]) && controllers[p(a - 1, b)].color !== controllers[index].color
              || controllers[p(a, b + 1)] && connectsToRegular(controllers[p(a, b + 1)]) && controllers[p(a, b + 1)].color !== controllers[index].color
              || controllers[p(a, b - 1)] && connectsToRegular(controllers[p(a, b - 1)]) && controllers[p(a, b - 1)].color !== controllers[index].color) {
              controllers[index].setInvalid(true);
            }
          }

          const [x, y, z] = parseP(index);
          const block = {
            'slime': 'minecraft:slime_block',
            'extra-slime': 'minecraft:slime_block',
            'amethyst': 'minecraft:obsidian',
            'regular': 'minecraft:smooth_basalt',
          }[type] ?? 'minecraft:air';

          renderer.setBlockState(x, y, z, block);
        }
      }

      machineCountContainer.textContent = String(currentColor);
      function floodFill(a: number, b: number, n: number, color: number) {
        const index = p(a, b);
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
          total_number += floodFill(a + 1, b, n + 1, color);
          total_number += floodFill(a - 1, b, n + 1, color);
          total_number += floodFill(a, b + 1, n + 1, color);
          total_number += floodFill(a, b - 1, n + 1, color);
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

      renderer.requestRenderIfNotRequested();
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

  // renderer.animate(-1, 5, (frame) => {
  //   const y = schematic.height - 1 - (frame % schematic.height);
  //   for (let z = 0; z < schematic.length; z++) {
  //     for (let x = 0; x < schematic.width; x++) {
  //       if (renderer.getBlockState(x, y, z) !== 'minecraft:budding_amethyst') {
  //         const mesh = renderer.getBlockMesh(x, y, z);
  //         if (mesh) {
  //           mesh.visible = !mesh.visible;
  //         }
  //       }
  //     }
  //   }

  //   return true;
  // });

}