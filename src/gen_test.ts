import { base64 } from "./util";
import { SchematicWriter } from "./litematic";

const writer = new SchematicWriter('test', 'test');

let x = 0;
let y = 0;
let z = 0;
function setBlock(blockState: string) {
  if (y >= 16) { return; }
  writer.setBlock(x, y, z, blockState);
  x++;
  if (x >= 16) {
    z++;
    x = 0;
  }
  if (z >= 16) {
    y++;
    z = 0;
  }
}

for (const power of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
  for (const east of ['up', 'side', 'none']) {
    for (const west of ['up', 'side', 'none']) {
      for (const north of ['up', 'side', 'none']) {
        for (const south of ['up', 'side', 'none']) {
          setBlock(`minecraft:redstone_wire[east=${east},north=${north},power=${power},south=${south},west=${west}]`);
        }
      }
    }
  }
}

for (const stair of ['purpur', 'oak', 'cobblestone', 'brick', 'stone_brick', 'nether_brick', 'sandstone', 'spruce', 'birch', 'jungle', 'quartz', 'acacia', 'dark_oak', 'prismarine', 'prismarine_brick', 'dark_prismarine']) {
  for (const facing of ['east', 'north', 'south', 'west']) {
    for (const half of ['bottom', 'top']) {
      for (const shape of ['inner_left', 'inner_right', 'outer_left', 'outer_right', 'straight']) {
        for (const waterlogged of [true, false]) {
          setBlock(`minecraft:${stair}_stairs[facing=${facing},half=${half},shape=${shape},waterlogged=${waterlogged}]`);
        }
      }
    }
  }
}

for (const fence of ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'nether_brick']) {
  for (const east of [true, false]) {
    for (const north of [true, false]) {
      for (const south of [true, false]) {
        for (const waterlogged of [true, false]) {
          for (const west of [true, false]) {
            setBlock(`minecraft:${fence}_fence[east=${east},north=${north},south=${south},waterlogged=${waterlogged},west=${west}]`);
          }
        }
      }
    }
  }
}

for (const east of [true, false]) {
  for (const north of [true, false]) {
    for (const south of [true, false]) {
      for (const waterlogged of [true, false]) {
        for (const west of [true, false]) {
          for (const pane of ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']) {
            setBlock(`minecraft:${pane}_stained_glass_pane[east=${east},north=${north},south=${south},waterlogged=${waterlogged},west=${west}]`);
          }
          setBlock(`minecraft:glass_pane[east=${east},north=${north},south=${south},waterlogged=${waterlogged},west=${west}]`);
          setBlock(`minecraft:iron_bars[east=${east},north=${north},south=${south},waterlogged=${waterlogged},west=${west}]`);
        }
      }
    }
  }
}

for (const color of ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']) {
  for (const facing of ['north', 'south', 'east', 'west']) {
    for (const occupied of [true, false]) {
      for (const part of ['foot', 'head']) {
        setBlock(`minecraft:${color}_bed[facing=${facing},occupied=${occupied},part=${part}]`);
      }
    }
    setBlock(`minecraft:${color}_glazed_terracotta[facing=${facing}]`);
    setBlock(`minecraft:${color}_wall_banner[facing=${facing}]`);
  }
  setBlock(`minecraft:${color}_wool`);
  setBlock(`minecraft:${color}_terracotta`);
  setBlock(`minecraft:${color}_carpet`);
  setBlock(`minecraft:${color}_stained_glass`);
  setBlock(`minecraft:${color}_concrete`);
  setBlock(`minecraft:${color}_concrete_powder`);

  for (const rotation of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
    setBlock(`minecraft:${color}_banner[rotation=${rotation}]`);
  }
}


console.log('SCHEMATIC', x, y, z);

const schematic = writer.asNbtData();
const palette = schematic['Regions']['test']['BlockStatePalette'];
const blockData = schematic['Regions']['test']['BlockStates'];

(async () => {
  console.log('schematic', base64(await writer.save()));
})();

export { palette, blockData };
