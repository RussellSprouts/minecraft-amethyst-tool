
export abstract class AsyncTask {
}

export function send(value: unknown) {
  let transfers: Transferable[] = [];
  if (value instanceof MessagePort
    || value instanceof ImageBitmap
    || value instanceof ArrayBuffer) {
    transfers = [value];
  } else if (implementsToTransferable(value)) {
    transfers = value.transferables();
  }

  new Worker('').postMessage(value, transfers);
}

interface ToTransferable {
  transferables(): Transferable[];
}

function implementsToTransferable(value: unknown): value is ToTransferable {
  const asTransferable = value as ToTransferable;
  return typeof asTransferable.transferables === 'function';
}