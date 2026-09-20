import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from '../../domain/models/sort-order.enum';

/**
 * **PaginatedQueryDto — Shared base class for paginated list query parameters**
 *
 * Carries `pageIndex`, `pageSize`, `sortBy`, and `sortDir` decorated for
 * class-validator and Swagger. Consuming modules should extend this class and
 * add `@IsIn([...])` on `sortBy` to restrict to their allowed column names.
 *
 * Must live in the presentation layer because it carries `@nestjs/swagger` and
 * `class-validator` decorators — the domain layer must remain decorator-free.
 */
export class PaginatedQueryDto {
  @ApiPropertyOptional({ default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pageIndex?: number = 0;

  @ApiPropertyOptional({ default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ example: 'createdBy' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC, example: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortDir?: SortOrder = SortOrder.ASC;
}
