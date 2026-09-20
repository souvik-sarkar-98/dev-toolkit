import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MissingRequiredPortError } from '../../domain/errors/missing-required-port.error';

export interface RequiredPortSpec {
  token: symbol | string;
  fixHint: string;
}

/**
 * Factory for an OnModuleInit guard that throws MissingRequiredPortError when
 * any required port token is not bound in the host application.
 */
export function createRequiredPortsGuard(
  moduleName: string,
  ports: RequiredPortSpec[],
): Type<OnModuleInit> {
  @Injectable()
  class RequiredPortsGuard implements OnModuleInit {
    constructor(private readonly moduleRef: ModuleRef) {}

    onModuleInit(): void {
      for (const { token, fixHint } of ports) {
        const resolved = this.moduleRef.get(token, { strict: false });
        if (resolved === undefined || resolved === null) {
          throw new MissingRequiredPortError(moduleName, token, fixHint);
        }
      }
    }
  }

  return RequiredPortsGuard;
}
