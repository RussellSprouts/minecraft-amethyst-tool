
export function checkExhaustive(a: never): never {
  throw new Error(`Unexpected case: ${a}`);
}