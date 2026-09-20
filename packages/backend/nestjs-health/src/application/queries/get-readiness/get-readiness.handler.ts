import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ReadinessReport } from '../../../domain/value-objects/readiness-report.vo';
import { ServiceIdentity } from '../../../domain/value-objects/service-identity.vo';
import { HEALTH_OPTIONS, type HealthModuleOptions } from '../../../health.schema';
import type { ReadinessResult } from '../../dtos/health.dto';
import { HealthMapper } from '../../mappers/health.mapper';
import { HealthCheckRunner } from '../../services/health-check-runner.service';
import { GetReadinessQuery } from './get-readiness.query';

@QueryHandler(GetReadinessQuery)
@Injectable()
export class GetReadinessHandler implements IQueryHandler<GetReadinessQuery, ReadinessResult> {
  constructor(
    private readonly runner: HealthCheckRunner,
    @Inject(HEALTH_OPTIONS) private readonly options: HealthModuleOptions,
  ) {}

  async execute(): Promise<ReadinessResult> {
    const checks = await this.runner.runAll();
    const identity = ServiceIdentity.of(this.options.serviceName, this.options.version);
    const report = ReadinessReport.from(checks, identity, new Date());
    return HealthMapper.toReadinessResult(report, this.options.exposeCheckDetails);
  }
}
