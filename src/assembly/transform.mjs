/**
 * In order to compile the AssemblyScript bindings into
 * the binary (rather than having them external), we need
 * to convert them into Closure-style JS.
 */
import * as fs from 'fs';

let inputFile = fs.readFileSync(process.argv[2], 'utf-8');

inputFile = inputFile.replace('export async function instantiate',
`
goog.module('assembly');
async function instantiate`);
inputFile = inputFile.replace('await WebAssembly.instantiate(module, imports)', '/** @type {!WebAssembly.Instance}*/(await WebAssembly.instantiate(module, imports))')
inputFile += '\nexports = {instantiate};\n';

fs.writeFileSync(process.argv[2], inputFile);
