
export abstract class AsyncTask {
}

export function send(value: unknown) {
  let transfers: Transferable[] = [];
  if (value instanceof MessagePort
    || value instanceof ImageBitmap
    || value instanceof ArrayBuffer) {
    transfers = [value];
  } else if (implementsToTransferable(value)) {
    transfers = value.transferables();
  }

  new Worker('').postMessage(value, transfers);
}

export interface ToTransferable {
  transferables(): Transferable[];
}

function implementsToTransferable(value: unknown): value is ToTransferable {
  const asTransferable = value as ToTransferable;
  return typeof asTransferable.transferables === 'function';
}

declare global {
  export interface AsyncTaskSerializeFormat {
    test: { data: ArrayBuffer, i: number };
  }
}

export interface SerializeResult<N extends keyof AsyncTaskSerializeFormat> {
  typeName: N;
  value: AsyncTaskSerializeFormat[N];
  transfer?: Transferable[];
}

export interface Deserializer<N extends keyof AsyncTaskSerializeFormat, T> {
  deserialize(value: SerializeResult<N>): T;
  new(...args: any[]): Serializable<N>;
}

export interface Serializable<N extends keyof AsyncTaskSerializeFormat> {
  serialize(): SerializeResult<N>;
}

class Test implements Serializable<'test'> {
  constructor(private readonly data = new ArrayBuffer(10), private i = 0) { }

  serialize(): SerializeResult<'test'> {
    return {
      typeName: 'test',
      value: {
        data: this.data,
        i: this.i
      },
      transfer: [this.data]
    };
  }

  static deserialize(serialized: SerializeResult<'test'>): Test {
    return new Test(serialized.value.data, serialized.value.i);
  }
}

const deserializers: Record<string, Deserializer<any, any>> = {};
export function registerDeserialize<N extends keyof AsyncTaskSerializeFormat>(name: N, deserializer: Deserializer<N, any>) {
  deserializers[name] = deserializer;
}
registerDeserialize('test', Test);

interface SerializingClass<T extends SerializeResult2> {
  deserialize(value: T): InstanceType<SerializingClass<T>>;
  new(...args: any[]): {
    serialize(): T;
  }
}
export interface SerializeResult2 {
  readonly typeName: string;
  readonly value: any;
  readonly transfer?: readonly Transferable[];
}

class Test2 {
  static deserialize(value: SerializeResult2): Test2 {
    return new Test2();
  }
  serialize(): SerializeResult2 {
    return {
      typeName: '',
      value: '',
    };
  }
}

function a<T extends SerializeResult2>(clazz: SerializingClass<T>) {
  console.log(clazz);
}

a(Test2);