import { DynamicModule } from '@nestjs/common';
import { DatabaseModule, DATABASE_OPTIONS } from '@ssdev-toolkit/nestjs-persistence/database.module';
import { PRISMA_CLIENT } from '@ssdev-toolkit/nestjs-persistence/prisma/base-prisma.service';

const validOptions = {
  redisUrl: 'redis://localhost:6379',
  prismaClientFactory: () => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $extends: jest.fn().mockReturnThis(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  }),
};

type ProviderLike = {
  provide?: unknown;
  useValue?: { redisUrl?: string };
  useFactory?: (...args: unknown[]) => unknown;
  inject?: unknown[];
};

function findProvider(
  mod: DynamicModule,
  token: symbol | string,
): ProviderLike | undefined {
  const direct = (mod.providers as ProviderLike[] | undefined)?.find(
    (p) => p.provide === token,
  );
  if (direct) return direct;

  for (const imported of mod.imports ?? []) {
    if (typeof imported === 'function') continue;
    const nested = findProvider(imported as DynamicModule, token);
    if (nested) return nested;
  }

  return undefined;
}

describe('DatabaseModule', () => {
  describe('forRoot()', () => {
    it('returns a DynamicModule', () => {
      const mod = DatabaseModule.forRoot(validOptions);
      expect(mod).toBeDefined();
      expect(mod.module).toBe(DatabaseModule);
    });

    it('is marked as global', () => {
      const mod = DatabaseModule.forRoot(validOptions) as any;
      expect(mod.global).toBe(true);
    });

    it('provides DATABASE_OPTIONS token with validated options', () => {
      const mod = DatabaseModule.forRoot(validOptions) as DynamicModule;
      const optionsProvider = findProvider(mod, DATABASE_OPTIONS);
      expect(optionsProvider).toBeDefined();
      expect(optionsProvider!.useValue!.redisUrl).toBe(validOptions.redisUrl);
    });

    it('provides PRISMA_CLIENT token', () => {
      const mod = DatabaseModule.forRoot(validOptions) as DynamicModule;
      const prismaProvider = (mod.providers as any[]).find(
        (p) => p.provide === PRISMA_CLIENT,
      );
      expect(prismaProvider).toBeDefined();
      expect(typeof prismaProvider.useFactory).toBe('function');
    });

    it('creates Prisma client from sync validated options', () => {
      const prismaClient = { $connect: jest.fn(), $disconnect: jest.fn() };
      const prismaClientFactory = jest.fn().mockReturnValue(prismaClient);
      const mod = DatabaseModule.forRoot({
        ...validOptions,
        prismaClientFactory,
      }) as DynamicModule;
      const prismaProvider = (mod.providers as any[]).find(
        (p) => p.provide === PRISMA_CLIENT,
      );

      expect(prismaProvider.useFactory()).toBe(prismaClient);
      expect(prismaClientFactory).toHaveBeenCalledWith();
    });

    it('throws on missing prismaClientFactory', () => {
      expect(() =>
        DatabaseModule.forRoot({
          redisUrl: validOptions.redisUrl,
        } as any),
      ).toThrow('[DatabaseModule] Config validation failed:');
    });

    it('exports BasePrismaService and CacheService', () => {
      const mod = DatabaseModule.forRoot(validOptions) as DynamicModule;
      expect(mod.exports).toBeDefined();
      expect((mod.exports as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe('forRootAsync()', () => {
    it('returns a DynamicModule with async factory', () => {
      const mod = DatabaseModule.forRootAsync({
        useFactory: () => validOptions,
      });
      expect(mod).toBeDefined();
      expect(mod.module).toBe(DatabaseModule);
      const optionsProvider = findProvider(mod, DATABASE_OPTIONS);
      expect(optionsProvider).toBeDefined();
      expect(typeof optionsProvider!.useFactory).toBe('function');
    });

    it('accepts inject array for factory dependencies', () => {
      const TOKEN = Symbol('MyToken');
      const mod = DatabaseModule.forRootAsync({
        inject: [TOKEN],
        useFactory: (_myToken: any) => validOptions,
      });
      const optionsProvider = findProvider(mod, DATABASE_OPTIONS);
      expect(optionsProvider!.inject).toContain(TOKEN);
    });

    it('validates async factory options', async () => {
      const mod = DatabaseModule.forRootAsync({
        useFactory: () => ({
          ...validOptions,
          redisUrl: 'not-a-url',
        }),
      });
      const optionsProvider = findProvider(mod, DATABASE_OPTIONS);

      await expect(optionsProvider!.useFactory!()).rejects.toThrow(
        '[DatabaseModule] Config validation failed:',
      );
    });

    it('creates Prisma client from validated DATABASE_OPTIONS provider', () => {
      const mod = DatabaseModule.forRootAsync({
        useFactory: () => validOptions,
      });
      const prismaProvider = (mod.providers as any[]).find(
        (p) => p.provide === PRISMA_CLIENT,
      );

      expect(prismaProvider.inject).toEqual([DATABASE_OPTIONS]);
    });

    it('async Prisma provider uses validated DATABASE_OPTIONS', async () => {
      const prismaClient = { $connect: jest.fn(), $disconnect: jest.fn() };
      const prismaClientFactory = jest.fn().mockReturnValue(prismaClient);
      const mod = DatabaseModule.forRootAsync({
        useFactory: () => ({
          ...validOptions,
          prismaClientFactory,
        }),
      });
      const optionsProvider = findProvider(mod, DATABASE_OPTIONS);
      const prismaProvider = (mod.providers as any[]).find(
        (p) => p.provide === PRISMA_CLIENT,
      );
      const validated = await optionsProvider!.useFactory!();

      await expect(prismaProvider.useFactory(validated)).resolves.toBe(prismaClient);
      expect(prismaClientFactory).toHaveBeenCalledWith();
    });
  });
});
