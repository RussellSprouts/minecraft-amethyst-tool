
import { parallelMap } from "../util";

describe('parallelMap', () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

  it('should give all results in order', async () => {
    const value = await parallelMap(Array(10), { max: 10 }, (_, i) => {
      return new Promise((resolve) => {
        setTimeout(
          () => { resolve(i); },
          Math.random() * 1000
        );
      });
    });

    expect(value).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});