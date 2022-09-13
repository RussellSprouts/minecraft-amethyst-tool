import { instantiate } from "goog:assembly";
type Awaited<T> = T extends Promise<infer P> ? P : never;
type Assembly = Awaited<ReturnType<typeof instantiate>>;

let resolveAssembly!: (arg: Assembly | Promise<Assembly>) => void;
export const assembly = new Promise<Assembly>((resolve) => {
  resolveAssembly = resolve;
});

export async function loadAssembly(path: string) {
  resolveAssembly(instantiate(await WebAssembly.compileStreaming(fetch(path)), {}));
}