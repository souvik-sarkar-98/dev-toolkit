import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HealthStatus } from '../../domain/enums/health-status.enum';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import type { HealthCheckDetail, ReadinessResult } from '../../application/dtos/health.dto';

export class HealthCheckDetailDto implements HealthCheckDetail {
  @ApiProperty({ example: 'database' })
  name!: string;

  @ApiProperty({ enum: HealthStatus, example: HealthStatus.UP })
  status!: HealthStatus;

  @ApiProperty({ description: 'A failing critical check makes the instance not ready.' })
  critical!: boolean;

  @ApiProperty({ example: 12 })
  durationMs!: number;

  @ApiPropertyOptional({ description: 'Failure reason, when the check did not pass.' })
  message?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  details?: Record<string, unknown>;
}

export class ReadinessResponseDto implements ReadinessResult {
  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.OK })
  status!: ServiceStatus;

  @ApiProperty({ description: 'False when at least one critical dependency is down.' })
  ready!: boolean;

  @ApiProperty({ description: 'Ready, but a non-critical dependency is down.' })
  degraded!: boolean;

  @ApiProperty({
    description: 'Status per registered indicator, keyed by indicator name.',
    type: 'object',
    additionalProperties: { type: 'string', enum: Object.values(HealthStatus) },
    example: { database: HealthStatus.UP, redis: HealthStatus.UP },
  })
  checks!: Record<string, HealthStatus>;

  @ApiPropertyOptional({
    type: [HealthCheckDetailDto],
    description: 'Per-check diagnostics. Present only when `exposeCheckDetails` is enabled.',
  })
  details?: HealthCheckDetailDto[];

  @ApiProperty({ format: 'date-time', example: '2026-08-01T08:45:12.031Z' })
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Configured service name.' })
  service?: string;

  @ApiPropertyOptional({ description: 'Configured build or release version.' })
  version?: string;
}
