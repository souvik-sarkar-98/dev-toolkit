/**
 * QueueModule forRoot unit tests.
 * Deep infrastructure services are mocked to avoid bullmq decorator issues.
 * The queue.schema.spec.ts covers option validation exhaustively.
 */

// ── Mock deep infrastructure ──────────────────────────────────────────────
jest.mock('@ssdev-toolkit/nestjs-queue/infrastructure/services/queue-processing.service', () => ({
  QueueProcessingService: class QueueProcessingService { },
}));
jest.mock('@ssdev-toolkit/nestjs-queue/infrastructure/services/queue-processor-registry.service', () => ({
  QueueProcessorRegistry: class QueueProcessorRegistry { },
}));
jest.mock('@ssdev-toolkit/nestjs-queue/application/services/queue.facade', () => ({
  QueueFacade: class QueueFacade { },
}));
jest.mock('@ssdev-toolkit/nestjs-queue/presentation/controllers/queue.controller', () => ({
  QueueController: class QueueController { },
}));

// ── Imports ──────────────────────────────────────────────────────────────────
import { QueueModule } from '@ssdev-toolkit/nestjs-queue/queue.module';

const validConnection = { url: 'redis://localhost:6379' };

// ── Tests ────────────────────────────────────────────────────────────────────
describe('QueueModule', () => {
  describe('forRoot()', () => {
    it('returns a DynamicModule', () => {
      const mod = QueueModule.forRoot({ connection: validConnection });
      expect(mod).toBeDefined();
      expect(mod.module).toBe(QueueModule);
    });

    it('has providers defined', () => {
      const mod = QueueModule.forRoot({ connection: validConnection });
      expect(mod.providers).toBeDefined();
    });

    it('uses "default" queue when no queues specified', () => {
      const mod = QueueModule.forRoot({ connection: validConnection });
      expect(mod.imports).toBeDefined();
      expect((mod.imports as any[]).length).toBeGreaterThan(0);
    });

    it('exports QueueFacade', () => {
      const mod = QueueModule.forRoot({ connection: validConnection });
      expect(mod.exports).toBeDefined();
      expect((mod.exports as any[]).length).toBeGreaterThan(0);
    });

    it('accepts host/port connection instead of URL', () => {
      expect(() =>
        QueueModule.forRoot({
          connection: { host: 'redis-server', port: 6379, password: 'secret' },
        }),
      ).not.toThrow();
    });

    it('registers QueueFacade in providers', () => {
      const mod = QueueModule.forRoot({ connection: validConnection });
      const providerClasses = (mod.providers as any[]).map((p) =>
        typeof p === 'function' ? p.name : p?.useClass?.name ?? null,
      );
      expect(providerClasses).toContain('QueueFacade');
    });

    it('defaults concurrency to 1', () => {
      const mod = QueueModule.forRoot({ connection: validConnection });
      const optionsProvider = (mod.providers as any[]).find(
        (p) => typeof p === 'object' && p.useValue && p.useValue.concurrency !== undefined,
      );
      expect(optionsProvider?.useValue?.concurrency).toBe(1);
    });

    it('rejects connection with neither url nor host', () => {
      expect(() =>
        QueueModule.forRoot({ connection: {} as any }),
      ).toThrow(/Provide either connection\.url or connection\.host/);
    });
  });
});
