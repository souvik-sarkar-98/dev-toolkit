import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceStatus } from '../../domain/enums/service-status.enum';
import type { MetricsResult } from '../../application/dtos/health.dto';
import type { LoadAverageSnapshot } from '../../domain/ports/runtime-metrics.port';
import type {
  CpuMetrics,
  ProcessMemoryMetrics,
  SystemMemoryMetrics,
} from '../../domain/value-objects/runtime-metrics.vo';

export class ProcessMemoryDto implements ProcessMemoryMetrics {
  @ApiProperty() rssBytes!: number;
  @ApiProperty() rssMb!: number;
  @ApiProperty() heapTotalBytes!: number;
  @ApiProperty() heapTotalMb!: number;
  @ApiProperty() heapUsedBytes!: number;
  @ApiProperty() heapUsedMb!: number;
  @ApiProperty() externalBytes!: number;
  @ApiProperty() externalMb!: number;
  @ApiProperty() arrayBuffersBytes!: number;
  @ApiProperty() arrayBuffersMb!: number;
  @ApiProperty({ description: 'Heap used as a percentage of heap total.' })
  heapUsedPercent!: number;
}

export class SystemMemoryDto implements SystemMemoryMetrics {
  @ApiProperty() totalBytes!: number;
  @ApiProperty() totalMb!: number;
  @ApiProperty() freeBytes!: number;
  @ApiProperty() freeMb!: number;
  @ApiProperty() usedBytes!: number;
  @ApiProperty() usedMb!: number;
  @ApiProperty({ description: 'Used memory as a percentage of total host memory.' })
  usedPercent!: number;
}

export class MemoryDto {
  @ApiProperty({ type: ProcessMemoryDto }) process!: ProcessMemoryDto;
  @ApiProperty({ type: SystemMemoryDto }) system!: SystemMemoryDto;
}

export class CpuDto implements CpuMetrics {
  @ApiProperty() userMicros!: number;
  @ApiProperty() systemMicros!: number;
  @ApiProperty() userMs!: number;
  @ApiProperty() systemMs!: number;
}

export class LoadAverageDto implements LoadAverageSnapshot {
  @ApiProperty() oneMinute!: number;
  @ApiProperty() fiveMinutes!: number;
  @ApiProperty() fifteenMinutes!: number;
}

export class MetricsResponseDto implements MetricsResult {
  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.OK })
  status!: ServiceStatus;

  @ApiProperty({ format: 'date-time', example: '2026-08-01T08:45:12.031Z' })
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Configured service name.' })
  service?: string;

  @ApiPropertyOptional({ description: 'Configured build or release version.' })
  version?: string;

  @ApiProperty({ example: 3612.44 }) uptimeSeconds!: number;
  @ApiProperty() pid!: number;
  @ApiProperty({ example: 'v22.14.0' }) nodeVersion!: string;
  @ApiProperty({ example: 'linux' }) platform!: string;
  @ApiProperty({ example: 'x64' }) arch!: string;
  @ApiProperty() cpuCount!: number;

  @ApiProperty({ type: MemoryDto }) memory!: MemoryDto;
  @ApiProperty({ type: CpuDto }) cpu!: CpuDto;
  @ApiProperty({ type: LoadAverageDto }) loadAverage!: LoadAverageDto;
}
