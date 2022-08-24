const random_tick_speed = 3;
const blocks_per_subchunk = 16 * 16 * 16;
const avg_ticks_between_random_ticks =
  blocks_per_subchunk / random_tick_speed;
const budding_amethyst_chance_to_tick = 0.2;
const faces_per_amethyst = 6;
const expected_ticks_for_one_stage = avg_ticks_between_random_ticks /
  budding_amethyst_chance_to_tick * faces_per_amethyst;

console.log(expected_ticks_for_one_stage, "EXPECTED");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateOptimalTime() {
  let bestTime = 0;
  let bestExpected = 0;
  for (let i = 160 * 20 * 60; i < 170 * 20 * 60; i++) {
    const expected = chanceAtLeast4(i) / i;
    console.log('TICKS BETWEEN HARVESTS', i, expected);

    if (expected > bestExpected) {
      bestExpected = expected;
      bestTime = i;
    }
  }

  console.log('BEST:', bestTime, bestExpected);
  return bestTime;
}

export const optimal_time = 199937; // about 167 minutes, calculated using calculateOptimalTime

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateExpectedShardsPerBlockPerHour() {
  const shards_dropped_when_broken = 2;
  const expected_shards_per_harvest_per_face =
    chanceAtLeast4(optimal_time) * shards_dropped_when_broken;
  return expected_shards_per_harvest_per_face / optimal_time * 60 * 60 * 20;
}

export const expected_shards_per_hour_per_face = 0.5170611995265756; // calculated with calculateExpectedShardsPerBlockPerHour

function chanceAtLeast4(ticks_between_harvests: number) {
  const chance_0 = binomial(0, ticks_between_harvests, 1 / expected_ticks_for_one_stage);
  const chance_1 = binomial(1, ticks_between_harvests, 1 / expected_ticks_for_one_stage);
  const chance_2 = binomial(2, ticks_between_harvests, 1 / expected_ticks_for_one_stage);
  const chance_3 = binomial(3, ticks_between_harvests, 1 / expected_ticks_for_one_stage);
  return 1 - chance_0 - chance_1 - chance_2 - chance_3;
}

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


function expectedShardsFromSingleFortuneFacePerHour() {
  const average_shards_dropped_with_fortune = 8.8;
  const expected_ticks_for_full_growth = expected_ticks_for_one_stage * 4;
  return expected_ticks_for_full_growth * average_shards_dropped_with_fortune / (60 * 60 * 20);
}

console.log('EXPECTED OUTPUT PER HOUR', expectedShardsFromSingleFortuneFacePerHour());