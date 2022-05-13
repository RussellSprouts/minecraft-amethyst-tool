
export function checkExhaustive(a: never): never {
  throw new Error(`Unexpected case: ${a}`);
}

export function assertIsElement<T extends Element>(element: Element | null | undefined, elementType: { new(): T }): T {
  if (!(element instanceof elementType)) {
    throw new Error(`Expected element ${element} to be ${elementType}`);
  }

  return element;
}