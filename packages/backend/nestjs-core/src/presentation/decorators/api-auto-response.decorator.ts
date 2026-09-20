import { applyDecorators, HttpCode, HttpStatus, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { PagedResponse } from '../models/paged-response';
import { ErrorResponse, SuccessResponse } from '../models/response-model';
import {
  createPageType,
  createPagedSuccessResponseType,
  createSuccessResponseType,
  createVoidSuccessResponseType,
} from '../models/typed-responses';

/** Options for automatic response decorator */
export interface ApiAutoResponseOptions {
  /** HTTP status code (defaults: POST=201, others=200) */
  status?: number;
  /** Description for the response */
  description?: string;
  /** Whether to wrap in SuccessResponse (default: auto-detect) */
  wrapInSuccessResponse?: boolean;
  /** Whether the response is an array */
  isArray?: boolean;
}

/**
 * Automatically adds Swagger response decorators based on the return type.
 *
 * Usage examples:
 * ```typescript
 * @Get(':id')
 * @ApiAutoResponse(UserDto)
 * async getUser(@Param('id') id: string): Promise<UserDto> { ... }
 *
 * @Post()
 * @ApiAutoResponse(UserDto, { status: 201 })
 * async create(@Body() dto: CreateUserDto): Promise<SuccessResponse<UserDto>> { ... }
 * ```
 */
export function ApiAutoResponse<T>(
  model: Type<T>,
  options: ApiAutoResponseOptions = {},
): MethodDecorator {
  const ConcreteSuccessResponse = createSuccessResponseType(model, options.isArray);

  return applyDecorators(
    ApiExtraModels(model, SuccessResponse, PagedResponse, ErrorResponse, ConcreteSuccessResponse),
    ...createResponseDecorators(model, options, ConcreteSuccessResponse),
    ...createCommonErrorResponses(),
  );
}

/** Helper for SuccessResponse<T> pattern */
export function ApiAutoSuccessResponse<T>(
  model: Type<T>,
  options: Omit<ApiAutoResponseOptions, 'wrapInSuccessResponse'> = {},
): MethodDecorator {
  return applyDecorators(ApiAutoResponse(model, { ...options, wrapInSuccessResponse: true }));
}

/** Helper for primitive types (string, number, boolean) wrapped in SuccessResponse */
export function ApiAutoPrimitiveResponse(
  type: 'string' | 'number' | 'boolean',
  options: Omit<ApiAutoResponseOptions, 'wrapInSuccessResponse'> = {},
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(SuccessResponse, ErrorResponse),
    ...createPrimitiveResponseDecorators(type, options),
    ...createCommonErrorResponses(),
  );
}

/**
 * Helper for SuccessResponse<void> — operations that succeed but return no payload.
 */
export function ApiAutoVoidResponse(
  options: Omit<ApiAutoResponseOptions, 'wrapInSuccessResponse' | 'isArray'> = {},
): MethodDecorator {
  const ConcreteVoidSuccessResponse = createVoidSuccessResponseType();
  const { status = HttpStatus.OK, description } = options;
  const decorators: MethodDecorator[] = [];

  if (status !== HttpStatus.OK) {
    decorators.push(HttpCode(status));
  }

  if (status === HttpStatus.NO_CONTENT) {
    // A 204 carries no body, so documenting the envelope under 200 would
    // advertise a payload the client never receives.
    decorators.push(
      ApiNoContentResponse({
        description: description || 'Operation completed successfully — no response body',
      }),
    );
  } else {
    decorators.push(
      status === HttpStatus.CREATED
        ? ApiCreatedResponse({
            description: description || 'Operation completed successfully',
            type: ConcreteVoidSuccessResponse,
          })
        : ApiOkResponse({
            description: description || 'Operation completed successfully',
            type: ConcreteVoidSuccessResponse,
          }),
    );
  }

  return applyDecorators(
    ApiExtraModels(SuccessResponse, ErrorResponse, ConcreteVoidSuccessResponse),
    ...decorators,
    ...createCommonErrorResponses(),
  );
}

/** Helper for PagedResponse<T> pattern */
export function ApiAutoPagedResponse<T>(
  model: Type<T>,
  options: ApiAutoResponseOptions = {},
): MethodDecorator {
  const ConcretePage = createPageType(model);
  const ConcretePagedSuccessResponse = createPagedSuccessResponseType(model);

  return applyDecorators(
    ApiExtraModels(
      model,
      SuccessResponse,
      PagedResponse,
      ErrorResponse,
      ConcretePage,
      ConcretePagedSuccessResponse,
    ),
    ...createPagedResponseDecorators(model, options, ConcretePage, ConcretePagedSuccessResponse),
    ...createCommonErrorResponses(),
  );
}

function createPrimitiveResponseDecorators(
  type: 'string' | 'number' | 'boolean',
  options: ApiAutoResponseOptions,
): MethodDecorator[] {
  const { status = HttpStatus.OK, description, wrapInSuccessResponse = true } = options;
  const decorators: MethodDecorator[] = [];

  if (status !== HttpStatus.OK) {
    decorators.push(HttpCode(status));
  }

  if (wrapInSuccessResponse) {
    decorators.push(
      status === HttpStatus.CREATED
        ? ApiCreatedResponse({
            description: description || 'Operation successful',
            schema: {
              allOf: [
                { $ref: getSchemaPath(SuccessResponse) },
                { properties: { responsePayload: { type } } },
              ],
            },
          })
        : ApiOkResponse({
            description: description || 'Operation successful',
            schema: {
              allOf: [
                { $ref: getSchemaPath(SuccessResponse) },
                { properties: { responsePayload: { type } } },
              ],
            },
          }),
    );
  } else {
    decorators.push(
      status === HttpStatus.CREATED
        ? ApiCreatedResponse({ description: description || 'Operation successful', schema: { type } })
        : ApiOkResponse({ description: description || 'Operation successful', schema: { type } }),
    );
  }

  return decorators;
}

function createResponseDecorators(
  model: Type<any>,
  options: ApiAutoResponseOptions,
  concreteResponseType?: Type<any>,
): MethodDecorator[] {
  const { status = HttpStatus.OK, description, wrapInSuccessResponse, isArray = false } = options;
  const decorators: MethodDecorator[] = [];

  if (status !== HttpStatus.OK) {
    decorators.push(HttpCode(status));
  }

  const shouldWrap = wrapInSuccessResponse !== false;

  if (shouldWrap) {
    if (concreteResponseType) {
      decorators.push(
        status === HttpStatus.CREATED
          ? ApiCreatedResponse({
              description: description || 'Resource created successfully',
              type: concreteResponseType,
            })
          : ApiOkResponse({
              description: description || 'Operation successful',
              type: concreteResponseType,
            }),
      );
    } else {
      const responsePayloadSchema = isArray
        ? { type: 'array' as const, items: { $ref: getSchemaPath(model) } }
        : { $ref: getSchemaPath(model) };

      decorators.push(
        status === HttpStatus.CREATED
          ? ApiCreatedResponse({
              description: description || 'Resource created successfully',
              schema: {
                type: 'object',
                required: ['info', 'timestamp', 'message'],
                properties: {
                  info: { type: 'string', example: 'Success' },
                  timestamp: { type: 'string', format: 'date-time' },
                  traceId: { type: 'string' },
                  message: { type: 'string' },
                  responsePayload: responsePayloadSchema,
                },
              },
            })
          : ApiOkResponse({
              description: description || 'Operation successful',
              schema: {
                type: 'object',
                required: ['info', 'timestamp', 'message'],
                properties: {
                  info: { type: 'string', example: 'Success' },
                  timestamp: { type: 'string', format: 'date-time' },
                  traceId: { type: 'string' },
                  message: { type: 'string' },
                  responsePayload: responsePayloadSchema,
                },
              },
            }),
      );
    }
  } else {
    decorators.push(
      status === HttpStatus.CREATED
        ? ApiCreatedResponse({
            description: description || 'Resource created successfully',
            type: isArray ? [model] : model,
          })
        : ApiOkResponse({
            description: description || 'Operation successful',
            type: isArray ? [model] : model,
          }),
    );
  }

  return decorators;
}

function createPagedResponseDecorators(
  model: Type<any>,
  options: ApiAutoResponseOptions,
  concretePage?: Type<any>,
  concretePagedSuccessResponse?: Type<any>,
): MethodDecorator[] {
  const { status = HttpStatus.OK, description, wrapInSuccessResponse = true } = options;
  const decorators: MethodDecorator[] = [];

  if (status !== HttpStatus.OK) {
    decorators.push(HttpCode(status));
  }

  if (wrapInSuccessResponse) {
    if (concretePagedSuccessResponse) {
      decorators.push(
        ApiOkResponse({
          description: description || 'Paginated results retrieved successfully',
          type: concretePagedSuccessResponse,
        }),
      );
    } else {
      decorators.push(
        ApiOkResponse({
          description: description || 'Paginated results retrieved successfully',
          schema: {
            type: 'object',
            required: ['info', 'timestamp', 'message', 'responsePayload'],
            properties: {
              info: { type: 'string', example: 'Success' },
              timestamp: { type: 'string', format: 'date-time' },
              traceId: { type: 'string' },
              message: { type: 'string' },
              responsePayload: {
                type: 'object',
                required: ['content', 'totalSize', 'pageIndex', 'pageSize'],
                properties: {
                  content: { type: 'array', items: { $ref: getSchemaPath(model) } },
                  totalSize: { type: 'number' },
                  pageIndex: { type: 'number' },
                  pageSize: { type: 'number' },
                },
              },
            },
          },
        }),
      );
    }
  } else {
    if (concretePage) {
      decorators.push(
        ApiOkResponse({
          description: description || 'Paginated results retrieved successfully',
          type: concretePage,
        }),
      );
    } else {
      decorators.push(
        ApiOkResponse({
          description: description || 'Paginated results retrieved successfully',
          schema: {
            type: 'object',
            required: ['content', 'totalSize', 'pageIndex', 'pageSize'],
            properties: {
              content: { type: 'array', items: { $ref: getSchemaPath(model) } },
              totalSize: { type: 'number' },
              pageIndex: { type: 'number' },
              pageSize: { type: 'number' },
            },
          },
        }),
      );
    }
  }

  return decorators;
}

function createCommonErrorResponses(): MethodDecorator[] {
  return [
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Bad Request — Business logic error or validation failure',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Internal Server Error — An unexpected error occurred',
      type: ErrorResponse,
    }),
  ];
}
