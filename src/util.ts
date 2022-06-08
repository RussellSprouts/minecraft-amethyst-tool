
export function checkExhaustive(a: never): never {
  throw new Error(`Unexpected case: ${a}`);
}

export function assertInstanceOf<T>(value: unknown, constructorType: { new(...args: any[]): T }): T {
  if (!(value instanceof constructorType)) {
    throw new Error(`Expected element ${value} to be ${constructorType}`);
  }

  return value;
}
