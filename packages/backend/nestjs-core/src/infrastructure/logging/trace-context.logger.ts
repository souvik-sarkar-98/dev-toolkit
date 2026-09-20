import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { getTraceId } from '../utilities/trace-context.util';

/**
 * A custom logger that automatically stamps every log line with the active
 * trace ID from `AsyncLocalStorage`. Use this as the application logger to
 * correlate all log output within a single HTTP request.
 *
 * **Wiring in `main.ts`:**
 * ```ts
 * const app = await NestFactory.create(AppModule, {
 *   logger: new TraceContextLogger('error', 'NestJSApp'),
 * });
 * await applyConfig(app, { logLevel: false }); // skip duplicate useLogger call
 * ```
 *
 * **Wiring via `applyConfig` only (recommended application logs only — bootstrap logs use NestJS default):**
 * ```ts
 * await applyConfig(app, { logLevel: 'error', appName: 'NestJSApp' });
 * ```
 */
export class TraceContextLogger extends ConsoleLogger {
  constructor(logLevel: LogLevel = 'error', appName: string = 'NestJSApp') {
    super(appName, {
      logLevels: [logLevel],
      timestamp: true,
      colors: true,
    });
  }

  protected override formatMessage(logLevel: LogLevel, message: unknown, pidMessage: string, formattedLogLevel: string, contextMessage: string, timestampDiff: string): string {
    const traceId = getTraceId();
    const tracePrefix = traceId ? `[${traceId}] ` : '[no-trace] ';
    return super.formatMessage(logLevel, `${tracePrefix}${message}`, pidMessage, formattedLogLevel, contextMessage, timestampDiff);
  }
}