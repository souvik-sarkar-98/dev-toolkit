import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IgnoreCaptcha, Public } from '@ssdev-toolkit/nestjs-auth';
import type { ReadinessResult } from '../../application/dtos/health.dto';
import { GetLivenessQuery } from '../../application/queries/get-liveness/get-liveness.query';
import { GetReadinessQuery } from '../../application/queries/get-readiness/get-readiness.query';
import { LivenessResponseDto } from '../dtos/liveness-response.dto';
import { ReadinessResponseDto } from '../dtos/readiness-response.dto';

/** The slice of the HTTP response the readiness probe needs. Express and Fastify both satisfy it. */
interface ResponseStatusSetter {
  status(code: number): unknown;
}

/**
 * Orchestrator probes, mounted at the application root.
 *
 * Marked public because an orchestrator has no credentials — behind a global
 * auth guard these would answer 401 and the instance would never be marked ready.
 */
@ApiTags('Health')
@Controller()
@Public()
@IgnoreCaptcha()
export class HealthController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe — the process is running' })
  @ApiOkResponse({ type: LivenessResponseDto })
  getLiveness(): Promise<LivenessResponseDto> {
    return this.queryBus.execute(new GetLivenessQuery());
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — every critical dependency is reachable' })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'At least one critical dependency is down.',
    type: ReadinessResponseDto,
  })
  async getReadiness(
    @Res({ passthrough: true }) res: ResponseStatusSetter,
  ): Promise<ReadinessResponseDto> {
    const result = await this.queryBus.execute<GetReadinessQuery, ReadinessResult>(
      new GetReadinessQuery(),
    );
    if (!result.ready) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result as ReadinessResponseDto;
  }
}
