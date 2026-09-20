import { ApiProperty } from '@nestjs/swagger';
import { PAGINATION_EXAMPLES } from './swagger-examples';

/**
 * **PagedResponse — Presentation-layer pagination container**
 *
 * Swagger-decorated HTTP response shape for paginated results.
 * Infrastructure repositories return the framework-agnostic `Page<T>`;
 * application handlers map to `PagedResponse<T>` before returning to controllers.
 *
 * @typeParam T - The DTO type contained in this page.
 */
export class PagedResponse<T> {
  @ApiProperty({
    description: 'List of items for the current page',
    isArray: true,
    type: Object,
  })
  content: T[];

  @ApiProperty({ description: 'Current page index (0-based)', example: PAGINATION_EXAMPLES.pageIndex })
  pageIndex: number;

  @ApiProperty({ description: 'Page size (number of items per page)', example: PAGINATION_EXAMPLES.pageSize })
  pageSize: number;

  @ApiProperty({ description: 'Total number of items across all pages', example: PAGINATION_EXAMPLES.totalSize })
  totalSize: number;

  constructor(content: T[], totalSize: number, pageIndex: number, pageSize: number) {
    this.content = content;
    this.totalSize = totalSize;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }
}
