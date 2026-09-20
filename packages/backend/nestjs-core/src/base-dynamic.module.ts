import { FactoryProvider, ModuleMetadata, Provider } from '@nestjs/common';
import { z } from 'zod';
import { validateModuleOptions } from './infrastructure/utilities/validate-options.util';

export interface DynamicModuleAsyncOptions<TOptions>
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<TOptions> | TOptions;
  inject?: FactoryProvider['inject'];
}

/**
 * Base class for NestJS dynamic modules that require `forRoot()` or `forRootAsync()`.
 *
 * Provides inherited capabilities on top of the standard NestJS dynamic module pattern:
 * - **`validateOptions()`:** wraps `validateModuleOptions` and uses the subclass name automatically.
 * - **Option provider helpers:** creates validated sync/async options providers.
 */
export abstract class BaseDynamicModule {
  /** Validates raw options against the given Zod schema at bootstrap time. */
  protected static validateOptions<T extends z.ZodTypeAny>(
    schema: T,
    options: unknown,
  ): z.infer<T> {
    return validateModuleOptions(this.name, schema, options);
  }

  /** Creates a provider that validates and stores module options for forRoot(). */
  protected static createOptionsProvider<T extends z.ZodTypeAny>(
    token: symbol | string,
    schema: T,
    options: unknown,
  ): Provider<z.infer<T>> {
    return {
      provide: token,
      useValue: this.validateOptions(schema, options),
    };
  }

  /** Creates a provider that validates async factory output for forRootAsync(). */
  protected static createAsyncOptionsProvider<T extends z.ZodTypeAny>(
    token: symbol | string,
    schema: T,
    options: DynamicModuleAsyncOptions<z.input<T>>,
  ): FactoryProvider<z.infer<T>> {
    return {
      provide: token,
      useFactory: async (...args: any[]) =>
        this.validateOptions(schema, await options.useFactory(...args)),
      inject: options.inject ?? [],
    };
  }
}
