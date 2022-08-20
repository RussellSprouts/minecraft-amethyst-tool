/**
 * Declares the globals available in workers.
 */

declare global {
  // eslint-disable-next-line no-var
  var onmessage: ((this: Window, e: MessageEvent) => any) | null;
  function postMessage(data: any, transfer?: any[]): void;
  function importScripts(...scripts: string[]): void;
}

export { };