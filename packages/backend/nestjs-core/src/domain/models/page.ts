/**
 * **Page — Pure domain pagination result**
 *
 * A framework-agnostic, decorator-free container for paginated repository
 * results. Infrastructure repositories return `Page<T>`; the presentation layer
 * maps it to `PagedResponse<T>` which carries Swagger annotations.
 *
 * @typeParam T - The domain object type contained in this page.
 */
export class Page<T> {
  readonly content: T[];
  readonly totalSize: number;
  readonly pageIndex: number;
  readonly pageSize: number;

  constructor(content: T[], totalSize: number, pageIndex: number, pageSize: number) {
    this.content = content;
    this.totalSize = totalSize;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }
}
