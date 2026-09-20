import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LivenessReport } from '../../../domain/value-objects/liveness-report.vo';
import { ServiceIdentity } from '../../../domain/value-objects/service-identity.vo';
import { HEALTH_OPTIONS, type HealthModuleOptions } from '../../../health.schema';
import type { LivenessResult } from '../../dtos/health.dto';
import { HealthMapper } from '../../mappers/health.mapper';
import { GetLivenessQuery } from './get-liveness.query';

@QueryHandler(GetLivenessQuery)
@Injectable()
export class GetLivenessHandler implements IQueryHandler<GetLivenessQuery, LivenessResult> {
  constructor(@Inject(HEALTH_OPTIONS) private readonly options: HealthModuleOptions) {}

  async execute(): Promise<LivenessResult> {
    const identity = ServiceIdentity.of(this.options.serviceName, this.options.version);
    return HealthMapper.toLivenessResult(LivenessReport.alive(identity, new Date()));
  }
}
