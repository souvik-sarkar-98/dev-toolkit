import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs';
import { getTraceId } from '../../infrastructure/utilities/trace-context.util';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimingInterceptor.name);

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const req = ctx.switchToHttp().getRequest();
        this.logger.log(
          `[TimingInterceptor] [${getTraceId() || 'no-trace'}] ${req.method} ${req.url} ${Date.now() - start}ms`,
        );
      }),
    );
  }
}
