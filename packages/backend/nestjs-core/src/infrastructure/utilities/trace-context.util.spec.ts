import {
  getTraceId,
  getUserContext,
  resolveTraceId,
  traceStorage,
} from '@ssdev-toolkit/nestjs-core';

describe('Trace context utilities', () => {
  describe('resolveTraceId()', () => {
    it('returns x-request-id if present', () => {
      const id = resolveTraceId({ 'x-request-id': 'req-123' });
      expect(id).toBe('req-123');
    });

    it('returns x-trace-id if x-request-id is absent', () => {
      const id = resolveTraceId({ 'x-trace-id': 'trace-456' });
      expect(id).toBe('trace-456');
    });

    it('prefers x-request-id over x-trace-id', () => {
      const id = resolveTraceId({
        'x-request-id': 'req-1',
        'x-trace-id': 'trace-2',
      });
      expect(id).toBe('req-1');
    });

    it('generates a trace-prefixed ID when no headers present', () => {
      const id = resolveTraceId({});
      expect(id).toMatch(/^trace-\d+$/);
    });
  });

  describe('getTraceId() and getUserContext() inside AsyncLocalStorage', () => {
    it('returns undefined when called outside a trace context', () => {
      expect(getTraceId()).toBeUndefined();
      expect(getUserContext()).toBeUndefined();
    });

    it('returns the traceId set in the current context', (done) => {
      traceStorage.run({ traceId: 'test-trace' }, () => {
        expect(getTraceId()).toBe('test-trace');
        done();
      });
    });

    it('returns the user context set in the current context', (done) => {
      const user = { userId: 'user-1', userName: 'Alice' };
      traceStorage.run({ traceId: 'trace-1', user }, () => {
        expect(getUserContext()).toMatchObject(user);
        done();
      });
    });

    it('isolates contexts across concurrent runs', (done) => {
      let calls = 0;
      traceStorage.run({ traceId: 'ctx-A' }, () => {
        setTimeout(() => {
          expect(getTraceId()).toBe('ctx-A');
          calls++;
          if (calls === 2) done();
        }, 10);
      });
      traceStorage.run({ traceId: 'ctx-B' }, () => {
        setTimeout(() => {
          expect(getTraceId()).toBe('ctx-B');
          calls++;
          if (calls === 2) done();
        }, 10);
      });
    });
  });
});
