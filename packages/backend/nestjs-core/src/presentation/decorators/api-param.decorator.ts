import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { EXAMPLE_IDP_SUB, EXAMPLE_UUID } from '../models/swagger-examples';

/**
 * Path and query parameter decorators that carry example values.
 *
 * Nest infers parameters from `@Param()` / `@Query()` argument names, but that
 * inference cannot supply an example — so an undecorated route documents a bare
 * `type: string` and Swagger UI's "Try it out" starts empty. These helpers keep
 * the sample values consistent across every controller.
 */

/** Documents a resource UUID path parameter. */
export function ApiUuidParam(name: string, description?: string): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name,
      type: String,
      format: 'uuid',
      example: EXAMPLE_UUID,
      description: description ?? `Identifier of the ${name === 'id' ? 'resource' : name} (UUID)`,
    }),
  );
}

/** Documents an IdP subject path parameter — auth RBAC routes only. */
export function ApiIdpSubParam(name = 'idpSub'): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name,
      type: String,
      example: EXAMPLE_IDP_SUB,
      description: 'IdP subject claim (`sub`) of the target user',
    }),
  );
}

/** Documents a free-form string path parameter such as a slug or key. */
export function ApiKeyParam(name: string, example: string, description?: string): MethodDecorator {
  return applyDecorators(ApiParam({ name, type: String, example, description }));
}

/** Documents an optional string query parameter. */
export function ApiStringQuery(name: string, example: string, description?: string): MethodDecorator {
  return applyDecorators(
    ApiQuery({ name, type: String, required: false, example, description }),
  );
}

/**
 * Documents `pageIndex` / `pageSize` for routes that read them as standalone
 * `@Query()` arguments instead of extending `PaginatedQueryDto`.
 */
export function ApiPaginationQuery(): MethodDecorator {
  return applyDecorators(
    ApiQuery({
      name: 'pageIndex',
      type: Number,
      required: false,
      example: 0,
      description: 'Zero-based page index',
    }),
    ApiQuery({
      name: 'pageSize',
      type: Number,
      required: false,
      example: 20,
      description: 'Number of items per page',
    }),
  );
}
