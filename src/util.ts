
type BasicType = string | boolean | number | bigint | null | undefined;

export function memoize<T extends BasicType[], R>(fn: (...args: T) => R): (...args: T) => R {
  const cache = new Map<string, R>();
  return function memoizeWrapper(...args: T): R {
    const key = args.join(':');
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }
}
