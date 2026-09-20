import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Reflector } from '@nestjs/core';
import { IJwtVerifierPort } from '../../application/ports/jwt-verifier.port';
import { IApiKeyVerifierPort } from '../../application/ports/api-key-verifier.port';
import { IRecaptchaPort } from '../../application/ports/recaptcha.port';
import { MarkApiKeyUsedCommand } from '../../application/commands/mark-api-key-used/mark-api-key-used.command';
import { ApiKey } from '../../domain/aggregates/api-key/api-key.aggregate';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IGNORE_CAPTCHA } from '../decorators/ignore-captcha.decorator';
import { USE_API_KEY } from '../decorators/use-api-key.decorator';
import { EXPECTED_RECAPTCHA_ACTION_KEY } from '../decorators/expected-recaptcha-action.decorator';
import { AUTH_OPTIONS } from '../../infrastructure/auth-options.token';
import { AuthModuleOptions } from '../../auth-options';
import { setUserContext } from '@ssdev-toolkit/nestjs-core';

@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  private readonly logger = new Logger(UnifiedAuthGuard.name);
  private readonly apiKeyHeaderName: string;

  constructor(
    @Inject(IJwtVerifierPort) private readonly jwtVerifier: IJwtVerifierPort,
    @Inject(IApiKeyVerifierPort) private readonly apiKeyVerifier: IApiKeyVerifierPort,
    @Inject(IRecaptchaPort) private readonly recaptcha: IRecaptchaPort,
    private readonly commandBus: CommandBus,
    private readonly reflector: Reflector,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
  ) {
    this.apiKeyHeaderName = (options).apiKey?.headerName ?? 'x-api-key';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const ignoreCaptcha = this.reflector.getAllAndOverride<boolean>(IGNORE_CAPTCHA, [
        context.getHandler(),
        context.getClass(),
      ]);
      return ignoreCaptcha ? true : this.validateCaptcha(context);
    }

    const useApiKey = this.reflector.getAllAndOverride<boolean>(USE_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const hasJwt = !!this.extractJwtToken(request);

    if (useApiKey || (this.extractApiKey(request) && !hasJwt)) {
      return this.validateApiKey(request);
    }
    return this.validateJwt(request);
  }

  private async validateJwt(request: any): Promise<boolean> {
    const token = this.extractJwtToken(request);
    if (!token) {
      this.logger.warn(
        `JWT auth failed — missing token: path=${request.url} ip=${request.ip ?? 'unknown'}`,
      );
      throw new UnauthorizedException('JWT token is required');
    }

    try {
      const user = await this.jwtVerifier.verify(token);
      request.user = user;
      setUserContext({ userId: user.userId ?? user.idpSub, userName: user.name });
      return true;
    } catch (error: any) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `JWT auth failed — ${error?.message ?? error}: path=${request.url} ip=${request.ip ?? 'unknown'}`,
      );
      throw new UnauthorizedException('Invalid or expired JWT token.');
    }
  }

  private async validateApiKey(request: any): Promise<boolean> {
    const rawKey = this.extractApiKey(request);
    if (!rawKey) {
      this.logger.warn(
        `API key auth failed — missing key: path=${request.url} ip=${request.ip ?? 'unknown'}`,
      );
      throw new UnauthorizedException('API key is required');
    }

    try {
      const user = await this.apiKeyVerifier.validate(rawKey);
      request.user = user;
      setUserContext({ userId: user.userId ?? user.idpSub, userName: user.name });

      const apiKeyId = ApiKey.fetchKeyId(rawKey);
      if (apiKeyId) {
        const apiKeyEntityId = user.idpSub.replace('apikey:', '');
        this.commandBus
          .execute(new MarkApiKeyUsedCommand(apiKeyEntityId))
          .catch((err) => this.logger.warn('MarkApiKeyUsed failed', err));
      }

      return true;
    } catch (error: any) {
      this.logger.warn(
        `API key auth failed — ${error?.message ?? error}: path=${request.url} ip=${request.ip ?? 'unknown'}`,
      );
      throw error;
    }
  }

  private async validateCaptcha(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { token, action } = this.extractCaptchaToken(request);
    if (!token || !action) {
      this.logger.warn(
        `Captcha auth failed — missing token or action: path=${request.url} ip=${request.ip ?? 'unknown'}`,
      );
      throw new UnauthorizedException('Captcha token and action is required');
    }

    const expectedAction = this.reflector.getAllAndOverride<string | undefined>(
      EXPECTED_RECAPTCHA_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (expectedAction && expectedAction !== action) {
      this.logger.warn(
        `Captcha auth failed — action mismatch (expected ${expectedAction}, got ${action}): path=${request.url}`,
      );
      throw new UnauthorizedException('Captcha action mismatch');
    }

    const rawThreshold = process.env.GOOGLE_RECAPTCHA_THRESHOLD;
    const threshold = rawThreshold ? parseFloat(rawThreshold) : 0.5;
    const minScore = this.options.recaptcha?.minScore ?? (Number.isFinite(threshold) ? threshold : 0.5);

    const passed = await this.recaptcha.verify(token, action, minScore);
    if (!passed) {
      this.logger.warn(
        `Captcha verification failed: path=${request.url} ip=${request.ip ?? 'unknown'}`,
      );
    }
    return passed;
  }

  private extractJwtToken(request: any): string | null {
    const authHeader = request.headers.authorization as string | undefined;
    if (!authHeader) return null;
    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() === 'bearer' && token && !token.startsWith('sk_')) {
      return token;
    }
    return null;
  }

  private extractApiKey(request: any): string | null {
    const authHeader = request.headers.authorization as string | undefined;
    if (authHeader) {
      const [type, key] = authHeader.split(' ');
      if (type?.toLowerCase() === 'apikey') return key;
    }
    const headerVal = request.headers[this.apiKeyHeaderName.toLowerCase()];
    return headerVal ?? null;
  }

  private extractCaptchaToken(request: any): { token: string | undefined; action: string | undefined } {
    const token =
      request.headers['x-recaptcha-token'] ??
      request.headers['g-recaptcha-response'] ??
      request.body?.recaptchaToken;
    return {
      token: typeof token === 'string' ? token : undefined,
      action: request.headers['x-recaptcha-action'],
    };
  }
}
