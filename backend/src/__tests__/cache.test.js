const { SingleFlight, TTLCache } = require('../services/cache');

describe('bounded cache primitives', () => {
  test('evicts the least recently used entry', () => {
    const cache = new TTLCache({ maxEntries: 2, ttlMs: 60_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  test('coalesces identical concurrent work', async () => {
    const flight = new SingleFlight();
    const factory = jest.fn(async () => 42);
    const [first, second] = await Promise.all([
      flight.run('same', factory),
      flight.run('same', factory),
    ]);
    expect([first, second]).toEqual([42, 42]);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
