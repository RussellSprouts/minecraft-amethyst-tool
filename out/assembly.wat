(module
 (type $i64_i32_i32_i32_=>_none (func (param i64 i32 i32 i32)))
 (global $src/assembly/biome/biomeX (mut i32) (i32.const 0))
 (global $src/assembly/biome/biomeY (mut i32) (i32.const 0))
 (global $src/assembly/biome/biomeZ (mut i32) (i32.const 0))
 (export "biomeX" (global $src/assembly/biome/biomeX))
 (export "biomeY" (global $src/assembly/biome/biomeY))
 (export "biomeZ" (global $src/assembly/biome/biomeZ))
 (export "getBiomeSourceQuart" (func $src/assembly/biome/getBiomeSourceQuart))
 (func $src/assembly/biome/getBiomeSourceQuart (param $0 i64) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 f64)
  (local $5 f64)
  (local $6 i64)
  (local $7 i64)
  (local $8 i64)
  (local $9 i64)
  (local $10 i32)
  (local $11 i64)
  (local $12 i64)
  (local $13 i32)
  (local $14 i32)
  (local $15 f64)
  (local $16 f64)
  (local $17 f64)
  (local $18 i32)
  (local $19 i32)
  local.get $1
  i32.const 2
  i32.sub
  local.tee $10
  i32.const 2
  i32.shr_s
  local.set $19
  local.get $2
  i32.const 2
  i32.sub
  local.tee $2
  i32.const 2
  i32.shr_s
  local.set $18
  local.get $3
  i32.const 2
  i32.sub
  local.tee $1
  i32.const 2
  i32.shr_s
  local.set $13
  local.get $10
  i32.const 3
  i32.and
  f64.convert_i32_s
  f64.const 0.25
  f64.mul
  local.set $17
  local.get $2
  i32.const 3
  i32.and
  f64.convert_i32_s
  f64.const 0.25
  f64.mul
  local.set $16
  local.get $1
  i32.const 3
  i32.and
  f64.convert_i32_s
  f64.const 0.25
  f64.mul
  local.set $15
  i32.const 0
  local.set $2
  f64.const inf
  local.set $5
  i32.const 0
  local.set $1
  loop $for-loop|0
   local.get $1
   i32.const 8
   i32.lt_u
   if
    local.get $13
    local.get $13
    i32.const 1
    i32.add
    local.get $1
    i32.const 1
    i32.and
    i32.eqz
    local.tee $14
    select
    i64.extend_i32_s
    local.tee $9
    local.get $18
    local.get $18
    i32.const 1
    i32.add
    local.get $1
    i32.const 2
    i32.and
    i32.eqz
    local.tee $3
    select
    i64.extend_i32_s
    local.tee $8
    local.get $19
    local.get $19
    i32.const 1
    i32.add
    local.get $1
    i32.const 4
    i32.and
    i32.eqz
    local.tee $10
    select
    i64.extend_i32_s
    local.tee $7
    local.get $0
    local.get $0
    i64.const 6364136223846793005
    i64.mul
    i64.const 1442695040888963407
    i64.add
    i64.mul
    i64.add
    local.tee $6
    i64.const 6364136223846793005
    i64.mul
    i64.const 1442695040888963407
    i64.add
    local.get $6
    i64.mul
    i64.add
    local.tee $6
    i64.const 6364136223846793005
    i64.mul
    i64.const 1442695040888963407
    i64.add
    local.get $6
    i64.mul
    i64.add
    local.tee $6
    local.get $6
    i64.const 6364136223846793005
    i64.mul
    i64.const 1442695040888963407
    i64.add
    i64.mul
    local.get $7
    i64.add
    local.tee $6
    i64.const 6364136223846793005
    i64.mul
    i64.const 1442695040888963407
    i64.add
    local.get $6
    i64.mul
    local.get $8
    i64.add
    local.tee $6
    i64.const 6364136223846793005
    i64.mul
    i64.const 1442695040888963407
    i64.add
    local.get $6
    i64.mul
    local.get $9
    i64.add
    local.tee $6
    i64.const 24
    i64.shr_s
    local.tee $9
    i64.const 1024
    i64.rem_s
    local.set $8
    local.get $0
    local.get $6
    local.get $6
    i64.const 6364136223846793005
    i64.mul
    i64.const 1442695040888963407
    i64.add
    i64.mul
    i64.add
    local.tee $6
    i64.const 24
    i64.shr_s
    local.tee $7
    i64.const 1024
    i64.rem_s
    local.set $12
    local.get $15
    local.get $15
    f64.const 1
    f64.sub
    local.get $14
    select
    local.get $0
    local.get $6
    local.get $6
    i64.const 6364136223846793005
    i64.mul
    i64.const 1442695040888963407
    i64.add
    i64.mul
    i64.add
    i64.const 24
    i64.shr_s
    local.tee $6
    i64.const 1024
    i64.rem_s
    local.tee $11
    i64.const 1024
    i64.add
    local.get $11
    local.get $11
    i64.const 0
    i64.ne
    local.get $6
    i64.const 1024
    i64.xor
    i64.const 0
    i64.lt_s
    i32.and
    select
    f64.convert_i64_s
    f64.const 0.0009765625
    f64.mul
    f64.const 0.5
    f64.sub
    f64.const 0.9
    f64.mul
    f64.add
    local.tee $4
    local.get $4
    f64.mul
    local.get $16
    local.get $16
    f64.const 1
    f64.sub
    local.get $3
    select
    local.get $12
    i64.const 1024
    i64.add
    local.get $12
    local.get $12
    i64.const 0
    i64.ne
    local.get $7
    i64.const 1024
    i64.xor
    i64.const 0
    i64.lt_s
    i32.and
    select
    f64.convert_i64_s
    f64.const 0.0009765625
    f64.mul
    f64.const 0.5
    f64.sub
    f64.const 0.9
    f64.mul
    f64.add
    local.tee $4
    local.get $4
    f64.mul
    f64.add
    local.get $17
    local.get $17
    f64.const 1
    f64.sub
    local.get $10
    select
    local.get $8
    i64.const 1024
    i64.add
    local.get $8
    local.get $8
    i64.const 0
    i64.ne
    local.get $9
    i64.const 1024
    i64.xor
    i64.const 0
    i64.lt_s
    i32.and
    select
    f64.convert_i64_s
    f64.const 0.0009765625
    f64.mul
    f64.const 0.5
    f64.sub
    f64.const 0.9
    f64.mul
    f64.add
    local.tee $4
    local.get $4
    f64.mul
    f64.add
    local.tee $4
    local.get $5
    f64.lt
    if
     local.get $4
     local.set $5
     local.get $1
     local.set $2
    end
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|0
   end
  end
  local.get $19
  i32.const 1
  i32.add
  local.get $19
  local.get $2
  i32.const 4
  i32.and
  select
  global.set $src/assembly/biome/biomeX
  local.get $18
  i32.const 1
  i32.add
  local.get $18
  local.get $2
  i32.const 2
  i32.and
  select
  global.set $src/assembly/biome/biomeY
  local.get $13
  i32.const 1
  i32.add
  local.get $13
  local.get $2
  i32.const 1
  i32.and
  select
  global.set $src/assembly/biome/biomeZ
  global.get $src/assembly/biome/biomeY
  i32.const -16
  i32.lt_s
  if
   i32.const -16
   global.set $src/assembly/biome/biomeY
  end
  global.get $src/assembly/biome/biomeY
  i32.const 19
  i32.gt_s
  if
   i32.const 19
   global.set $src/assembly/biome/biomeY
  end
 )
)
