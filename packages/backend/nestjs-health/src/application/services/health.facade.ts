import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { LivenessResult, MetricsResult, ReadinessResult } from '../dtos/health.dto';
import { GetLivenessQuery } from '../queries/get-liveness/get-liveness.query';
import { GetMetricsQuery } from '../queries/get-metrics/get-metrics.query';
import { GetReadinessQuery } from '../queries/get-readiness/get-readiness.query';

/**
 * Public entry point for other modules that need health data programmatically —
 * a cron job that alerts on degradation, a queue worker that pauses when the
 * database is down. Always dispatches through the bus so the same handlers,
 * timeouts, and policies apply as on the HTTP probes.
 */
@Injectable()
export class HealthFacade {
  constructor(private readonly queryBus: QueryBus) {}

  getLiveness(): Promise<LivenessResult> {
    return this.queryBus.execute(new GetLivenessQuery());
  }

  getReadiness(): Promise<ReadinessResult> {
    return this.queryBus.execute(new GetReadinessQuery());
  }

  getMetrics(): Promise<MetricsResult> {
    return this.queryBus.execute(new GetMetricsQuery());
  }
}
