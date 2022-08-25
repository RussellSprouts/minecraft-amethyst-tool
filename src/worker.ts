/**
 * The entry point for the Web Worker. The root module
 */

import { getPatternData } from "./lib/afk_worker";
import { getBuddingAmethystPerChunk } from "./lib/geode_afk_worker";
import { processRegionFiles } from "./lib/region_files_worker";
import { WorkerContext, WrappedFunction } from "./lib/run_in_worker";

// Declare globals that are available in a worker.
declare global {
  // eslint-disable-next-line no-var
  var onmessage: ((this: Window, e: MessageEvent) => any) | null;
  function postMessage(data: any, transfer?: any[]): void;
  function importScripts(...scripts: string[]): void;
}

importScripts('../third_party/pako/pako.min.js', './root.js');

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
  console.log('handling remote call', e.data, typeof importScripts);

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