import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IRuntimeMetricsPort } from '../../../domain/ports/runtime-metrics.port';
import { RuntimeMetrics } from '../../../domain/value-objects/runtime-metrics.vo';
import { ServiceIdentity } from '../../../domain/value-objects/service-identity.vo';
import { HEALTH_OPTIONS, type HealthModuleOptions } from '../../../health.schema';
import type { MetricsResult } from '../../dtos/health.dto';
import { HealthMapper } from '../../mappers/health.mapper';
import { GetMetricsQuery } from './get-metrics.query';

@QueryHandler(GetMetricsQuery)
@Injectable()
export class GetMetricsHandler implements IQueryHandler<GetMetricsQuery, MetricsResult> {
  constructor(
    @Inject(IRuntimeMetricsPort) private readonly runtimeMetrics: IRuntimeMetricsPort,
    @Inject(HEALTH_OPTIONS) private readonly options: HealthModuleOptions,
  ) {}

  async execute(): Promise<MetricsResult> {
    const identity = ServiceIdentity.of(this.options.serviceName, this.options.version);
    const metrics = RuntimeMetrics.from(this.runtimeMetrics.capture(), identity, new Date());
    return HealthMapper.toMetricsResult(metrics);
  }
}
