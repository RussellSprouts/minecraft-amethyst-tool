import { AmethystCluster, LargeAmethystBud, MediumAmethystBud, SmallAmethystBud } from './amethyst_shard';
import { BasicSingleColor, BasicSingleTexture, Block, BlockData } from './block';
import { Chest } from './chest';
import { Comparator } from './comparator';
import { Hopper } from './hopper';
import { Observer } from './observer';
import { Piston } from './piston';
import { PistonHead } from './piston_head';
import { RedstoneLamp } from './redstone_lamp';
import { RedstoneWire } from './redstone_wire';
import { Repeater } from './repeater';
import { Scaffolding } from './scaffolding';
import { SlimeBlock } from './slime_block';
import { StickyPiston } from './sticky_piston';
import { StoneButton } from './stone_button';
import * as textures from '../../textures/index';
import { parseBlockState } from '../litematic';

const cache = new Map<string, Block>();
const constructors: Record<string, { new(data: BlockData): Block }> = {
  'default': Block,
  'minecraft:amethyst_cluster': AmethystCluster,
  'minecraft:chest': Chest,
  'minecraft:comparator': Comparator,
  'minecraft:hopper': Hopper,
  'minecraft:large_amethyst_bud': LargeAmethystBud,
  'minecraft:medium_amethyst_bud': MediumAmethystBud,
  'minecraft:observer': Observer,
  'minecraft:piston_head': PistonHead,
  'minecraft:piston': Piston,
  'minecraft:redstone_lamp': RedstoneLamp,
  'minecraft:redstone_wire': RedstoneWire,
  'minecraft:repeater': Repeater,
  'minecraft:scaffolding': Scaffolding,
  'minecraft:slime_block': SlimeBlock,
  'minecraft:small_amethyst_bud': SmallAmethystBud,
  'minecraft:sticky_piston': StickyPiston,
  'minecraft:stone_button': StoneButton,

  'minecraft:calcite': BasicSingleColor('#aaa'),
  'minecraft:smooth_basalt': BasicSingleColor('#333'),
  'minecraft:amethyst_block': BasicSingleColor('#7457a5'),
  'minecraft:budding_amethyst': BasicSingleColor('#ab8ae3'),
  'minecraft:stone': BasicSingleColor('#777'),
  'minecraft:dirt': BasicSingleColor('#61452e'),
  'minecraft:diorite': BasicSingleColor('#aaa'),
  'minecraft:andesite': BasicSingleColor('#777'),
  'minecraft:granite': BasicSingleColor('#7f5646'),
  'minecraft:deepslate': BasicSingleColor('#333'),
  'minecraft:gravel': BasicSingleColor('#888'),
  'minecraft:iron_block': BasicSingleColor('#aaa'),
  'minecraft:water': BasicSingleColor('#00f', 0.1),

  'minecraft:note_block': BasicSingleTexture(textures.note_block),
  'minecraft:redstone_block': BasicSingleTexture(textures.redstone_block),
  'minecraft:obsidian': BasicSingleTexture(textures.obsidian),
  'minecraft:coal_ore': BasicSingleTexture(textures.coal_ore),
  'minecraft:copper_ore': BasicSingleTexture(textures.copper_ore),
  'minecraft:lapis_ore': BasicSingleTexture(textures.lapis_ore),
  'minecraft:iron_ore': BasicSingleTexture(textures.iron_ore),
  'minecraft:redstone_ore': BasicSingleTexture(textures.redstone_ore),
  'minecraft:diamond_ore': BasicSingleTexture(textures.diamond_ore),
  'minecraft:gold_ore': BasicSingleTexture(textures.gold_ore),
  'minecraft:emerald_ore': BasicSingleTexture(textures.emerald_ore),
  'minecraft:deepslate_coal_ore': BasicSingleTexture(textures.coal_ore + 1),
  'minecraft:deepslate_copper_ore': BasicSingleTexture(textures.copper_ore + 1),
  'minecraft:deepslate_lapis_ore': BasicSingleTexture(textures.lapis_ore + 1),
  'minecraft:deepslate_iron_ore': BasicSingleTexture(textures.iron_ore + 1),
  'minecraft:deepslate_redstone_ore': BasicSingleTexture(textures.redstone_ore + 1),
  'minecraft:deepslate_diamond_ore': BasicSingleTexture(textures.diamond_ore + 1),
  'minecraft:deepslate_gold_ore': BasicSingleTexture(textures.gold_ore + 1),
  'minecraft:deepslate_emerald_ore': BasicSingleTexture(textures.emerald_ore + 1),
  'minecraft:smooth_stone': BasicSingleTexture(textures.smooth_stone),
};

export function getBlockInfo(key: string): Block {
  if (cache.has(key)) {
    return cache.get(key)!;
  }
  const data = parseBlockState(key);
  const name = data['Name'];
  const result = new (constructors[name] ?? constructors['default'])(data);
  cache.set(key, result);
  return result;
}