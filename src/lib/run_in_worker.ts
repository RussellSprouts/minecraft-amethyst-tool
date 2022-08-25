import { assertInstanceOf, assertNotNull } from "./util";

export interface WrappedFunction<R extends Promise<any>, A extends any[]> {
  (...args: A): { promise: R, progress: EventTarget };
  original: (context: WorkerContext, ...args: A) => R;
  event: string;
}

export interface WorkerContext {
  progress(n: unknown): void;
  transfer(transfers: Transferable[]): void;
}

const workers = new Map<string, Worker>();
const resolvers = new Map<number, (value: any) => void>();
const progressHandlers = new Map<number, (value: number) => void>();
export function registerWorkerListener(worker: Worker) {
  worker.onmessage = (e) => {
    if (e.data.event === 'progress') {
      const handler = progressHandlers.get(e.data.id);
      if (!handler) {
        throw new Error(`Missing progressHandler for ${e.data.event}:${e.data.id}`);
      }
      handler(e.data.value);
    } else {
      const resolver = resolvers.get(e.data.id);
      if (!resolver) {
        throw new Error(`Missing resolver for ${e.data.event}:${e.data.id}`);
      }
      resolvers.delete(e.data.id);
      progressHandlers.delete(e.data.id);
      resolver(e.data.value);
    }
  };
}

export function enableWorkers() {
  const workers = document.querySelectorAll('script[type="application/russellsprouts-worker"]');
  for (const worker of workers) {
    const elt = assertInstanceOf(worker, HTMLScriptElement);
    createNamedWorker(
      assertNotNull(elt.dataset['name']),
      assertNotNull(elt.getAttribute('src')));
  }
}

export function createNamedWorker(name: string, src: string) {
  console.log("Creating named worker", name, src);
  const worker = new Worker(src);
  worker.postMessage({
    event: 'init-worker',
    value: {
      'name': name
    }
  });
  for (const [otherWorkerName, otherWorker] of workers.entries()) {
    const channel = new MessageChannel();
    worker.postMessage({
      event: 'register-worker',
      value: {
        name: otherWorkerName
      }
    }, [channel.port1]);
    otherWorker.postMessage({
      event: 'register-worker',
      value: {
        name
      }
    }, [channel.port2]);
  }

  workers.set(name, worker);
  registerWorkerListener(worker);
}


let nextId = 0;
export function runInWorker<A extends any[], R extends Promise<any>>(
  allowedWorkers: string[],
  event: string,
  fn: (context: WorkerContext, ...args: A) => R
): WrappedFunction<R, A> {
  const result: WrappedFunction<R, A> = (...args: A) => {
    const progress = new EventTarget();
    return {
      promise: new Promise((resolve) => {
        resolvers.set(nextId, resolve);
        progressHandlers.set(nextId, (value: number) => {
          progress.dispatchEvent(new CustomEvent('progress', {
            detail: value
          }));
        });

        const workerName = allowedWorkers[Math.floor(Math.random() * allowedWorkers.length)];
        const worker = workers.get(workerName);
        if (!worker) {
          throw new Error(`Couldn't find worker named ${workerName}`);
        }
        console.log('making remote call', event, nextId, args, allowedWorkers, workerName);
        worker.postMessage({
          event,
          id: nextId,
          args
        });

        nextId++;
      }) as R,
      progress
    };
  };
  result.original = fn;
  result.event = event;
  return result;
}


