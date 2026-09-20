import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { AuthModuleOptions } from '../../auth-options';
import { AUTH_OPTIONS } from '../../infrastructure/auth-options.token';
import {
  THROTTLER_BLOCK_DURATION,
  THROTTLER_KEY_GENERATOR,
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TTL,
  THROTTLER_TRACKER,
} from '../constants/throttler.constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ThrottleProfileName } from '../utilities/resolve-throttlers.util';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    @Inject(AUTH_OPTIONS) private readonly authOptions: AuthModuleOptions,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    if (await this.shouldSkip(context)) {
      return true;
    }

    const continues: boolean[] = [];
    for (const namedThrottler of this.throttlers) {
      if (!this.shouldApplyProfile(context, namedThrottler.name as ThrottleProfileName)) {
        continues.push(true);
        continue;
      }

      const skip = this.reflector.getAllAndOverride<boolean>(
        THROTTLER_SKIP + namedThrottler.name,
        [handler, classRef],
      );
      const skipIf = namedThrottler.skipIf || this.commonOptions.skipIf;
      if (skip || skipIf?.(context)) {
        continues.push(true);
        continue;
      }

      const routeOrClassLimit = this.reflector.getAllAndOverride<number>(
        THROTTLER_LIMIT + namedThrottler.name,
        [handler, classRef],
      );
      const routeOrClassTtl = this.reflector.getAllAndOverride<number>(
        THROTTLER_TTL + namedThrottler.name,
        [handler, classRef],
      );
      const routeOrClassBlockDuration = this.reflector.getAllAndOverride<number>(
        THROTTLER_BLOCK_DURATION + namedThrottler.name,
        [handler, classRef],
      );
      const routeOrClassGetTracker = this.reflector.getAllAndOverride<
        (req: Record<string, unknown>) => string
      >(THROTTLER_TRACKER + namedThrottler.name, [handler, classRef]);
      const routeOrClassGetKeyGenerator = this.reflector.getAllAndOverride<
        (context: ExecutionContext, suffix: string, name: string) => string
      >(THROTTLER_KEY_GENERATOR + namedThrottler.name, [handler, classRef]);

      const limit = await this.resolveLimit(context, routeOrClassLimit ?? namedThrottler.limit);
      const ttl = await this.resolveLimit(context, routeOrClassTtl ?? namedThrottler.ttl);
      const blockDuration = await this.resolveLimit(
        context,
        routeOrClassBlockDuration ?? namedThrottler.blockDuration ?? ttl,
      );
      const getTracker =
        routeOrClassGetTracker || namedThrottler.getTracker || this.commonOptions.getTracker;
      const generateKey =
        routeOrClassGetKeyGenerator ||
        namedThrottler.generateKey ||
        this.commonOptions.generateKey;

      continues.push(
        await this.handleRequest({
          context,
          limit,
          ttl,
          throttler: namedThrottler,
          blockDuration,
          getTracker,
          generateKey,
        }),
      );
    }

    return continues.every(Boolean);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (await super.shouldSkip(context)) {
      return true;
    }

    if (this.authOptions.throttler?.enabled === false) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ url?: string }>();
    const path = request.url?.split('?')[0] ?? '';
    const skipPathPrefixes = this.authOptions.throttler?.skipPathPrefixes ?? [];
    if (skipPathPrefixes.some((prefix) => path.startsWith(prefix))) {
      return true;
    }

    return false;
  }

  protected shouldApplyProfile(
    context: ExecutionContext,
    profile: ThrottleProfileName,
  ): boolean {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, classRef]) ?? false;

    switch (profile) {
      case 'default':
        return true;
      case 'open':
        return isPublic;
      case 'protected':
        return !isPublic;
      case 'strict':
        return (
          this.reflector.getAllAndOverride<number>(THROTTLER_LIMIT + profile, [
            handler,
            classRef,
          ]) !== undefined
        );
      default:
        return false;
    }
  }

  private async resolveLimit(
    context: ExecutionContext,
    resolvableValue: number | ((ctx: ExecutionContext) => number | Promise<number>),
  ): Promise<number> {
    return typeof resolvableValue === 'function'
      ? resolvableValue(context)
      : resolvableValue;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse();
    const ttlSeconds = Math.ceil(throttlerLimitDetail.ttl / 1000);
    if (ttlSeconds > 0) {
      response.setHeader('Retry-After', String(ttlSeconds));
    }
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
