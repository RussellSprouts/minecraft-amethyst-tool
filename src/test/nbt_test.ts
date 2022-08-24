import { decompress } from '../lib/compression';
import { Nbt } from '../lib/nbt';

import * as fs from 'fs';
import { DefaultEndianDataView } from '../lib/default_endian_data_view';

const bigTestNbtStr = 'H4sIAAAAAAAAAO1Uz08aQRR+wgLLloKxxBBjzKu1hKXbzUIRibGIFiyaDRrYqDGGuCvDgi67Znew8dRLe2x66z/TI39Dz732v6DDL3tpz73wMsn35r1v5ntvJnkCBFRyTywOeMuxTY149ONwYj4Iex3HpZMYD4JH3e6EAmK1oqrHeHZcV8uoVQ8byNYeapWGhg2tflh7j4PPg0+Db88DEG5bjj6+pThMZP0Q6tp0piNA3GYuaeG107tz+nYLKdsL4O/oPR44W+8RCFb13l3fC0DgXrf6ZLcEAIxBTHPGCFVM0yAufaTAyMIQs7reWAtTo+5EjkUDMLEnU4xM8ekUo1OMheHZn+Oz8kSBpXwz3di7x6p1E18oHAjXLtFZP68dG2AhWd/68QX+wc78nb0AvPFAyfiFQkBG/p7r6g+TOmiHYLvrMjejKAqOu/XQaWPKTtvp7ObmKzu9Jb5kSQk9qruU/Rh+6NIO2m8VTLFoPivhm5yEmbyEBQllWRZFAP8vKK4v8sKypC4dIHdaO7mMyucp31FByRa1xW2hKq0sxTF/unqSjl6dX/gSBSMb0fa3d6rNlXK8nt9YXUuXrpIXuUTQgMj6Pr+z3FTLB3Vuo7Z2WZKTqdxRUJlrzDXmGv9XIwhCy+kb1njC7P78evt9eNOE39TypPsIBgAA';

describe('Nbt', () => {
  let bigTestNbt!: Uint8Array;
  beforeAll(async () => {
    bigTestNbt = await decompress(
      Uint8Array.from(Buffer.from(bigTestNbtStr, 'base64')));
  });

  it('should parse everything with "*"', () => {
    expect(new Nbt('*').parse(bigTestNbt)).toEqual({
      'longTest': BigInt('9223372036854775807'),
      'shortTest': 32767,
      'stringTest': 'HELLO WORLD THIS IS A TEST STRING ÅÄÖ!',
      'floatTest': 0.4982314705848694,
      'intTest': 2147483647,
      'nested compound test': {
        'ham': {
          'name': 'Hampus',
          'value': 0.75
        },
        'egg': {
          'name': 'Eggbert',
          'value': 0.5
        }
      },
      'listTest (long)': [BigInt(11), BigInt(12), BigInt(13), BigInt(14), BigInt(15)],
      'listTest (compound)': [
        { 'name': 'Compound tag #0', 'created-on': BigInt('1264099775885') },
        { 'name': 'Compound tag #1', 'created-on': BigInt('1264099775885') }
      ],
      'byteTest': 127,
      'byteArrayTest (the first 1000 values of (n*n*255+n*7)%100, starting with n=0 (0, 62, 34, 16, 8, ...))':
        new DefaultEndianDataView(false, new Uint8Array(new Array(1000).map((_, n) => (n * n * 255 + n * 7) % 100)).buffer),
      'doubleTest': 0.4931287132182315
    });
  });

  it('should only output things defined in the shape', () => {
    expect(new Nbt({ 'shortTest': 'short' }).parse(bigTestNbt))
      .toEqual({ 'shortTest': 32767 });
  });

  it('should throw on mismatch', () => {
    expect(() => new Nbt({ 'longTest': 'int' }).parse(bigTestNbt))
      .toThrow();
  });

  it('should parse big-endian Java level.dat files', async () => {
    const levelDat = Uint8Array.from(fs.readFileSync('src/test/level.dat'));
    const nbt = await decompress(levelDat);
    expect(new Nbt('*').parse(nbt)).toEqual({
      'Data': {
        'WanderingTraderSpawnChance': 25,
        'BorderCenterZ': 0,
        'Difficulty': 2,
        'BorderSizeLerpTime': 0n,
        'raining': 0,
        'Time': 3032n,
        'GameType': 1,
        'ServerBrands': ['fabric'],
        'BorderCenterX': 0,
        'BorderDamagePerBlock': 0.2,
        'BorderWarningBlocks': 5,
        'WorldGenSettings': {
          'bonus_chest': 0,
          'seed': -2049030328n,
          'generate_features': 1,
          'dimensions': {
            'minecraft:overworld': {
              'generator': {
                'settings': 'minecraft:overworld',
                'seed': -2049030328n,
                'biome_source': { 'biome': 'minecraft:ocean', 'type': 'minecraft:fixed' },
                'type': 'minecraft:noise'
              },
              'type': 'minecraft:overworld'
            },
            'minecraft:the_nether': {
              'generator': {
                'settings': 'minecraft:nether',
                'seed': -2049030328n,
                'biome_source': {
                  'seed': -2049030328n,
                  'preset': 'minecraft:nether',
                  'type': 'minecraft:multi_noise'
                },
                'type': 'minecraft:noise'
              },
              'type': 'minecraft:the_nether'
            },
            'minecraft:the_end': {
              'generator': {
                'settings': 'minecraft:end',
                'seed': -2049030328n,
                'biome_source': { 'seed': -2049030328n, 'type': 'minecraft:the_end' },
                'type': 'minecraft:noise'
              },
              'type': 'minecraft:the_end'
            }
          }
        },
        'DragonFight': {
          'Gateways': [
            13, 1, 10, 15, 16, 14, 2,
            5, 11, 4, 18, 17, 6, 8,
            3, 9, 7, 0, 19, 12
          ],
          'DragonKilled': 1,
          'PreviouslyKilled': 1
        },
        'BorderSizeLerpTarget': 60000000,
        'Version': { 'Snapshot': 0, 'Id': 2580, 'Name': '1.16.3' },
        'DayTime': 3032n,
        'initialized': 1,
        'WasModded': 1,
        'allowCommands': 1,
        'WanderingTraderSpawnDelay': 21600,
        'CustomBossEvents': {},
        'GameRules': {
          'doFireTick': 'true',
          'maxCommandChainLength': '65536',
          'fireDamage': 'true',
          'reducedDebugInfo': 'false',
          'disableElytraMovementCheck': 'false',
          'announceAdvancements': 'true',
          'drowningDamage': 'true',
          'commandBlockOutput': 'true',
          'forgiveDeadPlayers': 'true',
          'doMobSpawning': 'true',
          'maxEntityCramming': '24',
          'disableRaids': 'false',
          'doWeatherCycle': 'true',
          'doDaylightCycle': 'true',
          'showDeathMessages': 'true',
          'doTileDrops': 'true',
          'universalAnger': 'false',
          'doInsomnia': 'true',
          'doImmediateRespawn': 'false',
          'naturalRegeneration': 'true',
          'doMobLoot': 'true',
          'fallDamage': 'true',
          'keepInventory': 'false',
          'doEntityDrops': 'true',
          'doLimitedCrafting': 'false',
          'mobGriefing': 'true',
          'randomTickSpeed': '3',
          'spawnRadius': '10',
          'doTraderSpawning': 'true',
          'logAdminCommands': 'true',
          'spectatorsGenerateChunks': 'true',
          'sendCommandFeedback': 'true',
          'doPatrolSpawning': 'true'
        },
        'Player': {
          'Brain': { 'memories': {} },
          'HurtByTimestamp': 0,
          'SleepTimer': 0,
          'Attributes': [
            {
              'Base': 0.10000000149011612,
              'Name': 'minecraft:generic.movement_speed'
            }
          ],
          'Invulnerable': 0,
          'FallFlying': 0,
          'PortalCooldown': 0,
          'AbsorptionAmount': 0,
          'abilities': {
            'invulnerable': 1,
            'mayfly': 1,
            'instabuild': 1,
            'walkSpeed': 0.10000000149011612,
            'mayBuild': 1,
            'flying': 0,
            'flySpeed': 0.05000000074505806
          },
          'FallDistance': 0,
          'recipeBook': {
            'recipes': [],
            'isBlastingFurnaceFilteringCraftable': 0,
            'isSmokerGuiOpen': 0,
            'isFilteringCraftable': 0,
            'toBeDisplayed': [],
            'isFurnaceGuiOpen': 0,
            'isGuiOpen': 0,
            'isFurnaceFilteringCraftable': 0,
            'isBlastingFurnaceGuiOpen': 0,
            'isSmokerFilteringCraftable': 0
          },
          'DeathTime': 0,
          'XpSeed': 0,
          'XpTotal': 0,
          'UUID': jasmine.any(DefaultEndianDataView),
          'playerGameType': 1,
          'seenCredits': 0,
          'Motion': [0, -0.0784000015258789, 0],
          'Health': 20,
          'foodSaturationLevel': 5,
          'Air': 300,
          'OnGround': 1,
          'Dimension': 'minecraft:overworld',
          'Rotation': [135.30006408691406, 31.200044631958008],
          'XpLevel': 0,
          'Score': 0,
          'Pos': [-36.423752824074874, 63, 528.9235893992649],
          'previousPlayerGameType': -1,
          'Fire': -20,
          'XpP': 0,
          'EnderItems': [],
          'DataVersion': 2580,
          'foodLevel': 20,
          'foodExhaustionLevel': 0,
          'HurtTime': 0,
          'SelectedItemSlot': 0,
          'Inventory': [{ 'Slot': 0, 'id': 'minecraft:grass_block', 'Count': 1 }],
          'foodTickTimer': 0
        },
        'SpawnY': 63,
        'rainTime': 75517,
        'thunderTime': 65531,
        'SpawnZ': 109,
        'hardcore': 0,
        'DifficultyLocked': 0,
        'SpawnX': 116,
        'clearWeatherTime': 0,
        'thundering': 0,
        'SpawnAngle': 0,
        'version': 19133,
        'BorderSafeZone': 5,
        'LastPlayed': 1612588488683n,
        'BorderWarningTime': 15,
        'ScheduledEvents': [],
        'LevelName': 'Navigation',
        'BorderSize': 60000000,
        'DataVersion': 2580,
        'DataPacks': { 'Enabled': ['vanilla'], 'Disabled': [] }
      }
    });
  });

  it('should parse little-endian bedrock nbt files', async () => {
    const levelDat = Uint8Array.from(fs.readFileSync('src/test/bedrock_level.dat'));
    const nbt = new Uint8Array(levelDat.buffer, 8);
    expect(new Nbt('*').parse(nbt, /*littleEndian:*/ true)).toEqual({
      'BiomeOverride': '',
      'CenterMapsToOrigin': 1,
      'ConfirmedPlatformLockedContent': 0,
      'Difficulty': 2,
      'FlatWorldLayers': 'null\n',
      'ForceGameType': 0,
      'GameType': 0,
      'Generator': 1,
      'InventoryVersion': '1.16.201',
      'LANBroadcast': 1,
      'LANBroadcastIntent': 1,
      'LastPlayed': 1612908502n,
      'LevelName': 'SkyBlock by BioJawn',
      'LimitedWorldOriginX': 1524,
      'LimitedWorldOriginY': 32767,
      'LimitedWorldOriginZ': 4,
      'MinimumCompatibleClientVersion': [1, 16, 200, 0, 0],
      'MultiplayerGame': 1,
      'MultiplayerGameIntent': 1,
      'NetherScale': 8,
      'NetworkVersion': 422,
      'Platform': 2,
      'PlatformBroadcastIntent': 3,
      'RandomSeed': 97443n,
      'SpawnV1Villagers': 0,
      'SpawnX': 0,
      'SpawnY': 62,
      'SpawnZ': 0,
      'StorageVersion': 8,
      'Time': 97185n,
      'XBLBroadcastIntent': 3,
      'abilities': {
        'attackmobs': 1,
        'attackplayers': 1,
        'build': 1,
        'doorsandswitches': 1,
        'flySpeed': 0.05000000074505806,
        'flying': 0,
        'instabuild': 0,
        'invulnerable': 0,
        'lightning': 0,
        'mayfly': 0,
        'mine': 1,
        'op': 0,
        'opencontainers': 1,
        'permissionsLevel': 0,
        'playerPermissionsLevel': 1,
        'teleport': 0,
        'walkSpeed': 0.10000000149011612
      },
      'baseGameVersion': '*',
      'bonusChestEnabled': 0,
      'bonusChestSpawned': 0,
      'commandblockoutput': 0,
      'commandblocksenabled': 0,
      'commandsEnabled': 1,
      'currentTick': 2293962n,
      'dodaylightcycle': 1,
      'doentitydrops': 1,
      'dofiretick': 1,
      'doimmediaterespawn': 0,
      'doinsomnia': 1,
      'domobloot': 1,
      'domobspawning': 1,
      'dotiledrops': 1,
      'doweathercycle': 1,
      'drowningdamage': 1,
      'eduOffer': 0,
      'educationFeaturesEnabled': 0,
      'experiments': { 'experiments_ever_used': 0, 'saved_with_toggled_experiments': 0 },
      'falldamage': 1,
      'firedamage': 1,
      'functioncommandlimit': 10000,
      'hasBeenLoadedInCreative': 1,
      'hasLockedBehaviorPack': 0,
      'hasLockedResourcePack': 0,
      'immutableWorld': 0,
      'isFromLockedTemplate': 0,
      'isFromWorldTemplate': 0,
      'isSingleUseWorld': 0,
      'isWorldTemplateOptionLocked': 0,
      'keepinventory': 0,
      'lastOpenedWithVersion': [1, 16, 201, 2, 0],
      'lightningLevel': 0,
      'lightningTime': 5433,
      'limitedWorldDepth': 16,
      'limitedWorldWidth': 16,
      'maxcommandchainlength': 65535,
      'mobgriefing': 1,
      'naturalregeneration': 1,
      'prid': '',
      'pvp': 1,
      'rainLevel': 0,
      'rainTime': 5433,
      'randomtickspeed': 1,
      'requiresCopiedPackRemovalCheck': 0,
      'sendcommandfeedback': 1,
      'serverChunkTickRange': 12,
      'showcoordinates': 1,
      'showdeathmessages': 1,
      'showtags': 1,
      'spawnMobs': 1,
      'spawnradius': 5,
      'startWithMapEnabled': 0,
      'texturePacksRequired': 0,
      'tntexplodes': 1,
      'useMsaGamertagsOnly': 0,
      'worldStartCount': 4294967264n
    });
  });
});
