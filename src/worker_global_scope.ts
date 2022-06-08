/**
 * Declares the globals available in workers.
 */

declare var onmessage: ((this: Window, e: MessageEvent) => any) | null;
declare function postMessage(data: any, transfer?: any[]): void;
declare function importScripts(...scripts: string[]): void;
