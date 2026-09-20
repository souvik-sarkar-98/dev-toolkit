import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import type { LivenessResult } from '../../application/dtos/health.dto';

export class LivenessResponseDto implements LivenessResult {
  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.OK })
  status!: ServiceStatus;

  @ApiProperty({ format: 'date-time', example: '2026-08-01T08:45:12.031Z' })
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Configured service name.' })
  service?: string;

  @ApiPropertyOptional({ description: 'Configured build or release version.' })
  version?: string;
}
