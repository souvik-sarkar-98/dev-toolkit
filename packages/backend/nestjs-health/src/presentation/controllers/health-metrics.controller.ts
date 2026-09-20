import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IgnoreCaptcha, Public } from '@ssdev-toolkit/nestjs-auth';
import { GetMetricsQuery } from '../../application/queries/get-metrics/get-metrics.query';
import { MetricsResponseDto } from '../dtos/metrics-response.dto';

/**
 * Kept separate from the probe controller so `metricsEndpoint: false` can drop
 * the route by not registering this class. The payload reports pid, Node
 * version, and host memory, which not every deployment wants exposed.
 */
@ApiTags('Health')
@Controller()
@Public()
@IgnoreCaptcha()
export class HealthMetricsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Runtime metrics — memory, CPU, uptime, and load average' })
  @ApiOkResponse({ type: MetricsResponseDto })
  getMetrics(): Promise<MetricsResponseDto> {
    return this.queryBus.execute(new GetMetricsQuery());
  }
}
