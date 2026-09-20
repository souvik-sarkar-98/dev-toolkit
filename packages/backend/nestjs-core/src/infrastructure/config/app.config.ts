import {
  INestApplication,
  Logger,
  LogLevel,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import * as bodyParser from 'body-parser';
import compression from 'compression';
import { NextFunction, Request, Response } from 'express';
import { isProd } from '../utilities/env.util';
import { resolveTraceId, traceStorage } from '../utilities/trace-context.util';
import { TraceContextLogger } from '../logging/trace-context.logger';
import { configureSwagger, SwaggerOptions } from '../../presentation/config/swagger.config';

export interface RouteExclusion {
  path: string;
  method: RequestMethod;
}

export interface AppConfigOptions {
  /** Global API prefix. Default: 'api' */
  globalPrefix?: string;
  /** Routes excluded from the global prefix. Default: [] */
  globalPrefixExclusions?: RouteExclusion[];
  /** Body size limit. Default: '10mb' */
  fileSize?: string;
  /** Enabled when true. Default: true in non-prod environments */
  enableSwagger?: boolean | 'auto';
  /** Swagger configuration options */
  swaggerOptions?: SwaggerOptions;
  /**
   * CORS allowed origins. There is NO permissive default — if this is omitted,
   * cross-origin requests are denied (same-origin only). Pass an explicit list
   * (or `true` to reflect the request origin) to enable CORS.
   */
  corsOrigins?: string | string[] | boolean;
  /** Send credentials (cookies/Authorization) on CORS responses. Default: false. */
  corsCredentials?: boolean;
  /** Current environment name used to decide swagger enablement and CORS warnings. Default: process.env.NODE_ENV */
  environment?: string;
  /**
   * Reject requests containing properties not present on the DTO.
   * Default: true (mass-assignment hardening).
   */
  forbidNonWhitelisted?: boolean;
  /**
   * Security headers via helmet. Default: enabled when `helmet` is installed.
   * Set to false to disable, or pass a helmet options object to customise.
   * Requires the optional `helmet` peer dependency.
   */
  helmet?: boolean | Record<string, unknown>;
  /**
   * Express `trust proxy` setting. Set this when the app runs behind a load
   * balancer / reverse proxy so `req.ip` reflects the real client address from
   * `X-Forwarded-For`.
   */
  trustProxy?: boolean | number | string | string[];
  /**
   * Logger configuration. When provided, `applyConfig` calls `app.useLogger()`
   * with a `TraceContextLogger` instance so all log lines carry the trace ID.
   * Set to `false` to skip logger override (e.g. when you already pass the
   * logger to `NestFactory.create`). Defaults to `'log'`.
   */
  logLevel?: LogLevel | false;
  /** App name shown in log context. Default: 'App' */
  appName?: string;
}

/**
 * Apply Express `trust proxy` on the underlying HTTP adapter. No-op (with a
 * warning) for non-Express adapters that do not expose `set()`.
 */
function applyTrustProxy(
  app: INestApplication,
  logger: Logger,
  value: AppConfigOptions['trustProxy'],
): void {
  if (value === undefined) return;
  try {
    const instance = app.getHttpAdapter?.()?.getInstance?.();
    if (instance && typeof instance.set === 'function') {
      instance.set('trust proxy', value);
    } else {
      logger.warn(
        "trustProxy was set but the HTTP adapter does not support `set('trust proxy', …)`. Ignoring.",
      );
    }
  } catch {
    logger.warn('trustProxy could not be applied to the HTTP adapter. Ignoring.');
  }
}

function applySecurityHeaders(
  app: INestApplication,
  logger: Logger,
  helmetOption: AppConfigOptions['helmet'],
): void {
  if (helmetOption === false) return;
  try {
    // helmet is an optional peer dependency — require lazily so consumers that
    // do not install it are unaffected (unless they explicitly opt in).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const helmet = require('helmet');
    const helmetFn = helmet.default ?? helmet;
    app.use(typeof helmetOption === 'object' ? helmetFn(helmetOption) : helmetFn());
  } catch {
    if (helmetOption) {
      throw new Error(
        "applyConfig: `helmet` option was set but the 'helmet' package is not installed. Run `npm install helmet`.",
      );
    }
    logger.warn(
      "Security headers disabled: install the optional 'helmet' package to enable them.",
    );
  }
}

/**
 * Apply standard NestJS app configuration to a bootstrapped application.
 * Call this in `main.ts` after `NestFactory.create()` and before `app.listen()`.
 *
 * This function handles HTTP-adapter-level concerns:
 * trust-proxy, compression, helmet, ValidationPipe, global prefix, body-parser,
 * Swagger, CORS, TraceContextLogger, and shutdown hooks.
 *
 * `GlobalExceptionFilter` and `TimingInterceptor` are DI-managed providers —
 * register them by importing `CoreModule` into the root `AppModule` instead.
 *
 * @example
 * // app.module.ts — import CoreModule once
 * @Module({ imports: [CoreModule, ...] })
 * export class AppModule {}
 *
 * // main.ts — call applyConfig for adapter-level wiring
 * const app = await NestFactory.create(AppModule);
 * applyConfig(app, {
 *   globalPrefixExclusions: [
 *     { path: '/callback/oauth/:provider', method: RequestMethod.GET },
 *   ],
 *   corsOrigins: process.env.CORS_ORIGINS?.split(','),
 *   logLevel: 'log',
 *   appName: 'MyApp',
 * });
 * await app.listen(3000);
 */
export function applyConfig(app: INestApplication, options: AppConfigOptions = {}) {
  const logger = new Logger('applyConfig');
  const {
    globalPrefix = 'api',
    globalPrefixExclusions = [],
    fileSize = '10mb',
    corsOrigins,
    corsCredentials = false,
    environment = process.env.NODE_ENV ?? 'development',
    swaggerOptions = {},
    forbidNonWhitelisted = true,
  } = options;

  // Configure proxy trust first so downstream middleware/guards (rate limiting,
  // trace context) observe the real client IP from X-Forwarded-For.
  applyTrustProxy(app, logger, options.trustProxy);

  const isProductionEnv = isProd(environment);
  const enableSwagger =
    options.enableSwagger === true ||
    (options.enableSwagger === 'auto' || options.enableSwagger === undefined ? !isProductionEnv : false);

  // ── Trace context middleware ───────────────────────────────────────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    const traceId = resolveTraceId(req.headers);
    res.setHeader('x-trace-id', traceId);
    traceStorage.run(
      {
        traceId,
        user: {
          userId: 'system',
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        },
      },
      () => next(),
    );
  });

  app.use(compression());

  // ── Security headers ──────────────────────────────────────────────────────
  applySecurityHeaders(app, logger, options.helmet);

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: isProductionEnv,
    }),
  );

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix(globalPrefix, { exclude: globalPrefixExclusions });

  // ── Body parser ───────────────────────────────────────────────────────────
  app.use(
    bodyParser.json({
      limit: fileSize,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(bodyParser.urlencoded({ limit: fileSize, extended: true }));

  // ── Swagger ───────────────────────────────────────────────────────────────
  if (enableSwagger) {
    configureSwagger(app, swaggerOptions);
  }

  // ── CORS ──────────────────────────────────────────────────────────────────
  // No permissive default: when corsOrigins is omitted, CORS is left disabled
  // (same-origin only). A wildcard origin is never combined with credentials.
  if (corsOrigins !== undefined) {
    if (corsCredentials && corsOrigins === '*') {
      throw new Error(
        "applyConfig: CORS cannot use credentials with a wildcard origin ('*'). Provide explicit origins.",
      );
    }
    // `x-trace-id` is exposed so browser clients can surface it in error UI.
    app.enableCors({
      origin: corsOrigins,
      credentials: corsCredentials,
      exposedHeaders: ['x-trace-id'],
    });
  } else if (isProductionEnv) {
    logger.warn(
      'CORS is disabled (no `corsOrigins` provided). Cross-origin browser requests will be blocked.',
    );
  }

  // ── Logger ────────────────────────────────────────────────────────────────
  // Wire TraceContextLogger so every log line carries the active trace ID.
  // Pass `logLevel: false` when you already set the logger in NestFactory.create().
  if (options.logLevel !== false) {
    app.useLogger(new TraceContextLogger(options.logLevel ?? 'error', options.appName ?? 'NestJSApp'));
  }

  app.enableShutdownHooks();
}
