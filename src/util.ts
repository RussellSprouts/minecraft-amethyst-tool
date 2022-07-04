
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
