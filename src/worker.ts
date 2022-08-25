/**
 * The entry point for the Web Worker. We use the location to pass
 * the list of dependencies with cache-busting hashes.
 */

// Declare globals that are available in a worker.
declare global {
  // eslint-disable-next-line no-var
  var onmessage: ((this: Window, e: MessageEvent) => any) | null;
  function postMessage(data: any, transfer?: any[]): void;
  function importScripts(...scripts: string[]): void;
}

// The worker is loaded at a path which includes its dependencies.
// e.g. worker.abc123.(third_party/pako/pako.min.321cba.js).js
// Load the js files listed as dependencies.
const params = location.pathname.match(/\((.*)\)/)?.[1].replace(/\$/g, '/');
if (params) {
  importScripts(...params.split(/,/g).map(d => `../${d}`));
}

import { getPatternData } from "./lib/afk_worker";
import { getBuddingAmethystPerChunk } from "./lib/geode_afk_worker";
import { processRegionFiles } from "./lib/region_files_worker";
import { WorkerContext, WrappedFunction } from "./lib/run_in_worker";

const handlers = new Map<string, WrappedFunction<any, any>>();

function registerFunction(arg: WrappedFunction<any, any>) {
  handlers.set(arg.event, arg);
}

console.log('I am the worker!');

registerFunction(processRegionFiles);
registerFunction(getBuddingAmethystPerChunk);
registerFunction(getPatternData);

let workerName = '';
const workers = new Map<string, MessagePort>();
async function handleMessage(e: MessageEvent) {
  if (e.data.event === 'init-worker') {
    workerName = e.data.value.name;
    console.log(`I'm the worker ${workerName}.`);
    return;
  } else if (e.data.event === 'register-worker') {
    const port = e.ports[0];
    port.onmessage = handleMessage;
    workers.set(e.data.value.name, port);
    console.log(`The worker ${workerName} now knows about ${e.data.value.name}`);
    port.postMessage({
      event: 'hello',
      value: { from: workerName, name: e.data.value.name }
    });
    return;
  } else if (e.data.event === 'hello') {
    console.log('Received a hello!', workerName, e.data.value);
    return;
  }

  const handler = handlers.get(e.data.event);
  if (!handler) {
    throw new Error(`Unhandled event ${e.data.event}`);
  }

  const transfers: Transferable[] = [];
  const context: WorkerContext = {
    progress(value: unknown) {
      postMessage({
        event: 'progress',
        forEvent: e.data.event,
        id: e.data.id,
        value
      });
    },
    transfer(value: Transferable[]) {
      transfers.push(...value);
    }
  };

  postMessage({
    event: e.data.event,
    id: e.data.id,
    value: await handler.original(context, ...e.data.args)
  }, transfers);
}
onmessage = handleMessage;