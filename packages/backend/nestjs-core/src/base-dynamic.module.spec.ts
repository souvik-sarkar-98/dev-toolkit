import { z } from 'zod';
import { BaseDynamicModule } from '@ssdev-toolkit/nestjs-core';

const TEST_OPTIONS = Symbol('TEST_OPTIONS');

const TestSchema = z.object({
  url: z.string().url(),
  retries: z.number().optional().default(3),
});

class TestDynamicModule extends BaseDynamicModule {
  static optionsProvider(options: unknown) {
    return this.createOptionsProvider(TEST_OPTIONS, TestSchema, options);
  }

  static asyncOptionsProvider(options: {
    useFactory: (...args: any[]) => any;
    inject?: any[];
  }) {
    return this.createAsyncOptionsProvider(TEST_OPTIONS, TestSchema, options);
  }
}

describe('BaseDynamicModule', () => {
  it('creates a validated sync options provider with defaults applied', () => {
    const provider = TestDynamicModule.optionsProvider({
      url: 'https://example.com',
    }) as any;

    expect(provider).toEqual({
      provide: TEST_OPTIONS,
      useValue: {
        url: 'https://example.com',
        retries: 3,
      },
    });
  });

  it('throws when sync options are invalid', () => {
    expect(() =>
      TestDynamicModule.optionsProvider({
        url: 'not-a-url',
      }),
    ).toThrow('[TestDynamicModule] Config validation failed:');
  });

  it('creates a validated async options provider with inject tokens', async () => {
    const TOKEN = Symbol('TOKEN');
    const provider = TestDynamicModule.asyncOptionsProvider({
      inject: [TOKEN],
      useFactory: (value: string) => ({ url: value }),
    });

    await expect(provider.useFactory('https://example.com')).resolves.toEqual({
      url: 'https://example.com',
      retries: 3,
    });
    expect(provider.inject).toEqual([TOKEN]);
  });

  it('defaults async provider inject to an empty array', () => {
    const provider = TestDynamicModule.asyncOptionsProvider({
      useFactory: () => ({ url: 'https://example.com' }),
    });

    expect(provider.inject).toEqual([]);
  });

  it('uses the subclass name in validation errors', async () => {
    const provider = TestDynamicModule.asyncOptionsProvider({
      useFactory: () => ({ url: 'not-a-url' }),
    });

    await expect(provider.useFactory()).rejects.toThrow(
      '[TestDynamicModule] Config validation failed:',
    );
  });

  it('propagates async factory errors before validation', async () => {
    const provider = TestDynamicModule.asyncOptionsProvider({
      useFactory: () => {
        throw new Error('config service unavailable');
      },
    });

    await expect(provider.useFactory()).rejects.toThrow(
      'config service unavailable',
    );
  });
});
