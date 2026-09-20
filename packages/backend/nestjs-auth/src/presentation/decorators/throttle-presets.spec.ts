import { StrictThrottle } from './throttle-presets';

describe('StrictThrottle', () => {
  it('requires a positive limit', () => {
    expect(() => StrictThrottle({ limit: 0 })).toThrow('StrictThrottle requires a positive limit');
  });

  it('sets strict metadata with explicit limits', () => {
    class TestController {
      @StrictThrottle({ limit: 5, ttlMs: 30_000 })
      handler() {}
    }

    const handler = TestController.prototype.handler;
    expect(Reflect.getMetadata('THROTTLER:LIMITstrict', handler)).toBe(5);
    expect(Reflect.getMetadata('THROTTLER:TTLstrict', handler)).toBe(30_000);
  });
});
