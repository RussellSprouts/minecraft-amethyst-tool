
export function checkExhaustive(a: never): never {
  throw new Error(`Unexpected case: ${a}`);
}

export function assertInstanceOf<T>(value: unknown, constructorType: { new(...args: any[]): T }): T {
  if (!(value instanceof constructorType)) {
    throw new Error(`Expected element ${value} to be ${constructorType}`);
  }

  return value;
}

export function assertNotNull<T>(a: T | null | undefined): Exclude<T, null | undefined> {
  if (a == null) {
    throw new Error('Got null value.');
  }
  return a as Exclude<T, null | undefined>;
}

export interface ParallelMapOptions {
  max: number;
}

export function parallelMap<T, R>(array: T[], options: ParallelMapOptions, mapper: (v: T, i: number, arr: T[]) => Promise<R>): Promise<R[]> {
  return new Promise((resolve, reject) => {
    const result = new Array<R>(array.length);
    let nWorking = 0;
    let index = 0;

    function startWorking() {
      while (index < array.length && nWorking < options.max) {
        const currentIndex = index;
        index++;
        const item = array[currentIndex];
        nWorking++;
        mapper(item, currentIndex, array)
          .then((v) => {
            result[currentIndex] = v;
          })
          .catch((err) => {
            reject(err);
          })
          .finally(() => {
            nWorking--;
            startWorking();
          });
      }

      if (index === array.length && nWorking === 0) {
        resolve(result);
      }
    }

    startWorking();
  });
}

export function base64(array: Uint8Array) {
  let binaryString = '';
  for (const i of array) {
    binaryString += String.fromCharCode(i);
  }
  return btoa(binaryString);
}

export function $(query: string): HTMLElement;
export function $<T extends HTMLElement>(query: string, constructorType?: { new(...args: any[]): T }): T;
export function $<T extends HTMLElement = HTMLElement>(query: string, constructorType?: { new(...args: any[]): T }): T {
  const element = document.querySelector(query);
  if (!constructorType) {
    return assertInstanceOf(element, HTMLElement) as T;
  } else {
    return assertInstanceOf(element, constructorType);
  }
}