import { Inject, Injectable } from '@nestjs/common';
import { BasePrismaService } from '@ssdev-toolkit/nestjs-persistence';
import type {
  HealthIndicatorOutcome,
  IHealthIndicator,
} from '../../domain/ports/health-indicator.port';
import { HEALTH_OPTIONS, type HealthModuleOptions } from '../../health.schema';

/**
 * Built-in indicator that issues a trivial query against the configured Prisma
 * client. Registered unless `databaseIndicator: false` is passed to the module.
 */
@Injectable()
export class DatabaseHealthIndicator implements IHealthIndicator {
  constructor(
    private readonly prisma: BasePrismaService,
    @Inject(HEALTH_OPTIONS) private readonly options: HealthModuleOptions,
  ) {}

  get name(): string {
    return this.options.database.name;
  }

  get critical(): boolean {
    return this.options.database.critical;
  }

  async check(): Promise<HealthIndicatorOutcome> {
    await this.prisma.healthCheck();
    return { healthy: true };
  }
}
