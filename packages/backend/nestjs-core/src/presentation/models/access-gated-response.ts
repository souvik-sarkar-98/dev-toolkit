import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * **AccessGatedResponse — Presentation-layer access-control wrapper**
 *
 * Base class for list/collection query responses where the caller may not
 * have permission to access the requested resource.
 *
 * - `hasAccess: false` → caller is not permitted; `reason` carries the
 *   machine-readable error code and `data` is an empty array.
 * - `hasAccess: true`  → caller is permitted; `data` contains the results.
 *
 * Subclasses should re-declare `data` with a concrete `@ApiProperty` type:
 * ```ts
 * export class ListFooResponseDto extends AccessGatedResponse<FooDto> {
 *   @ApiProperty({ type: [FooDto] })
 *   data: FooDto[];
 * }
 * ```
 *
 * @typeParam T - The DTO type contained in `data`.
 */
export class AccessGatedResponse<T> {
  @ApiProperty({ description: 'Whether the caller is permitted to access this resource' })
  hasAccess: boolean;

  @ApiPropertyOptional({ description: 'Machine-readable denial code when hasAccess is false' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Human-readable denial message when hasAccess is false' })
  message?: string;

  @ApiProperty({ isArray: true, type: Object, description: 'Result items; empty when hasAccess is false' })
  data: T[];
}
