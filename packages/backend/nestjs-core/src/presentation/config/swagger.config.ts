import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PagedResponse } from '../models/paged-response';
import { ErrorResponse, SuccessResponse } from '../models/response-model';


export interface SwaggerOptions {
  title?: string;
  description?: string;
  version?: string;
  extraModels?: any[];
}

/**
 * Builds the OpenAPI document without binding it to an HTTP route.
 *
 * Kept separate from {@link configureSwagger} so offline generators (which boot
 * the app in preview mode and never listen) produce a byte-identical document
 * to the one served at runtime.
 */
export function buildSwaggerDocument(app: INestApplication, options: SwaggerOptions = {}) {
  const title = options.title ?? 'API Documentation';
  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(options.description ?? `${title} powered by NestJS`)
    .setVersion(options.version ?? '1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'jwt',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Api-Key',
        description: 'API Key needed to access the endpoints',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      SuccessResponse,
      ErrorResponse,
      PagedResponse,
      ...(options.extraModels ?? []),
    ],
    deepScanRoutes: true,
  });

  // Post-process document to add permissions to description
  Object.values(document.paths).forEach((pathItem) => {
    Object.keys(pathItem).forEach((method) => {
      if (
        ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)
      ) {
        const operation = pathItem[method as keyof typeof pathItem] as
          | { description?: string; ['x-required-permissions']?: string[]; ['x-require-all-permissions']?: boolean }
          | undefined;
        if (operation) {
          const permissions = operation['x-required-permissions'] as string[];
          const requireAll = operation['x-require-all-permissions'] == true;

          if (Array.isArray(permissions) && permissions.length > 0) {
            const permissionList = permissions.map((p) => `- \`${p}\``).join('\n');
            const suffix = requireAll
              ? '\n_(All permissions required)_'
              : '\n_(Any of these permissions)_';

            const permissionText = `\n\n**Required Permissions:**\n${permissionList}${suffix}`;
            operation.description = (operation.description || '') + permissionText;
          }
        }
      }
    });
  });

  return document;
}

export function configureSwagger(app: INestApplication, options: SwaggerOptions = {}) {
  const document = buildSwaggerDocument(app, options);

  SwaggerModule.setup('swagger-ui', app, document, {
    jsonDocumentUrl: 'api/docs',
  });
}
