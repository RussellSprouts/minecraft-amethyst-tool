
goog.module('assembly');
async function instantiate(module, imports = {}) {
  const { exports } = /** @type {!WebAssembly.Instance}*/(await WebAssembly.instantiate(module, imports));
  const memory = exports.memory || imports.env.memory;
  const adaptedExports = Object.setPrototypeOf({
    getBiomeSourceQuart(biomeZoomSeed, x, y, z) {
      // src/assembly/biome/getBiomeSourceQuart(i64, i32, i32, i32) => void
      biomeZoomSeed = biomeZoomSeed || 0n;
      exports.getBiomeSourceQuart(biomeZoomSeed, x, y, z);
    },
  }, exports);
  return adaptedExports;
}

exports = {instantiate};
