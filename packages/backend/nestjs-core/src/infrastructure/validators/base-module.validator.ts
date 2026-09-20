import { Logger, OnModuleInit, Provider, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MissingRequiredPortError } from '../../domain/errors/missing-required-port.error';

/**
 * Abstract base for module-local startup validation.
 *
 * Subclasses must be declared in the same file as the module definition, must not
 * be exported, and must be registered via {@link registerModuleValidator} so they
 * cannot be injected by feature code.
 */
export abstract class BaseModuleValidator implements OnModuleInit {
  protected readonly logger: Logger;

  protected constructor(protected readonly moduleRef: ModuleRef) {
    this.logger = new Logger(this.getModuleName());
  }

  onModuleInit(): void {
    this.validateModule();
  }

  /** Human-readable module name for error messages and logs. */
  protected abstract getModuleName(): string;

  /** Required-port checks and optional warnings — runs once on module init. */
  protected abstract validateModule(): void;

  protected requirePort(token: symbol | string | Type<unknown>, fixHint: string): void {
    const resolved = this.moduleRef.get(token, { strict: false });
    if (resolved === undefined || resolved === null) {
      throw new MissingRequiredPortError(this.getModuleName(), token as symbol | string, fixHint);
    }
  }

  protected warn(message: string): void {
    this.logger.warn(message);
  }
}

/**
 * Registers an internal module validator under a module-local private token.
 * The validator is instantiated for lifecycle hooks only — do not inject it.
 */
export function registerModuleValidator(
  token: symbol,
  validatorClass: Type<BaseModuleValidator>,
): Provider {
  return { provide: token, useClass: validatorClass };
}
