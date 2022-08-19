
export class IntRange implements IterableIterator<number> {
  constructor(private start: number, private end: number, private readonly step = 1) {
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.step > 0 && this.start < this.end || this.step < 0 && this.start > this.end) {
      const result = { value: this.start, done: false } as const;
      this.start += this.step;
      return result;
    } else {
      return { value: undefined, done: true } as const;
    }
  }

  expand(n: number) {
    return new IntRange(this.start - n, this.end + n, this.step);
  }

  reverse() {
    return new IntRange(this.end - 1, this.start - 1, -this.step);
  }
}
