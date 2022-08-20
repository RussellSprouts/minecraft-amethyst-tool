import * as pako from 'pako';

export async function decompress(data: Uint8Array): Promise<Uint8Array> {
  return pako.ungzip(data);
}

export async function compress(data: Uint8Array): Promise<Uint8Array> {
  return pako.gzip(data);
}
