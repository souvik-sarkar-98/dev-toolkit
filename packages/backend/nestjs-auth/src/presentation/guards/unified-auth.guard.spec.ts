import 'reflect-metadata';
import { UnifiedAuthGuard } from './unified-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IGNORE_CAPTCHA } from '../decorators/ignore-captcha.decorator';
import { USE_API_KEY } from '../decorators/use-api-key.decorator';
import { AuthModuleOptions } from '../../auth-options';

const defaultOptions: AuthModuleOptions = {
  jwt: { jwksUri: 'https://example.com', issuer: 'iss', audience: 'aud' },
};

const makeJwtVerifier = () => ({
  verify: jest.fn(),
});

const makeApiKeyVerifier = () => ({
  validate: jest.fn(),
  invalidate: jest.fn(),
});

const makeRecaptcha = () => ({
  verify: jest.fn(),
});

const makeCommandBus = () => ({
  execute: jest.fn().mockResolvedValue(undefined),
});

function makeReflector(metadataMap: Record<string, unknown>) {
  return {
    getAllAndOverride: jest.fn((key: string) => metadataMap[key] ?? undefined),
  };
}

function makeContext({
  headers = {} as Record<string, string>,
  user = undefined as unknown,
  reflectorMeta = {} as Record<string, unknown>,
} = {}) {
  const request: Record<string, unknown> = { headers, url: '/test', ip: '127.0.0.1', user };
  const reflector = makeReflector(reflectorMeta);
  const context = {
    getHandler: jest.fn(() => ({})),
    getClass: jest.fn(() => ({})),
    switchToHttp: jest.fn(() => ({ getRequest: jest.fn(() => request) })),
  };
  return { context, reflector, request };
}

function buildGuard(overrides: Partial<{
  jwtVerifier: ReturnType<typeof makeJwtVerifier>;
  apiKeyVerifier: ReturnType<typeof makeApiKeyVerifier>;
  recaptcha: ReturnType<typeof makeRecaptcha>;
  commandBus: ReturnType<typeof makeCommandBus>;
  options: AuthModuleOptions;
}> = {}) {
  const jwtVerifier = overrides.jwtVerifier ?? makeJwtVerifier();
  const apiKeyVerifier = overrides.apiKeyVerifier ?? makeApiKeyVerifier();
  const recaptcha = overrides.recaptcha ?? makeRecaptcha();
  const commandBus = overrides.commandBus ?? makeCommandBus();
  const options = overrides.options ?? defaultOptions;

  return { jwtVerifier, apiKeyVerifier, recaptcha, commandBus, options };
}

function createGuard(parts: ReturnType<typeof buildGuard>, reflector: ReturnType<typeof makeReflector>) {
  return new UnifiedAuthGuard(
    parts.jwtVerifier as any,
    parts.apiKeyVerifier as any,
    parts.recaptcha as any,
    parts.commandBus as any,
    reflector as any,
    parts.options,
  );
}

describe('UnifiedAuthGuard', () => {
  describe('@Public() + @IgnoreCaptcha()', () => {
    it('returns true immediately without any verification', async () => {
      const { context, reflector } = makeContext({
        reflectorMeta: { [IS_PUBLIC_KEY]: true, [IGNORE_CAPTCHA]: true },
      });
      const parts = buildGuard();
      const guard = createGuard(parts, reflector);

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
      expect(parts.recaptcha.verify).not.toHaveBeenCalled();
      expect(parts.jwtVerifier.verify).not.toHaveBeenCalled();
    });
  });

  describe('@Public() without @IgnoreCaptcha()', () => {
    it('calls recaptcha.verify and returns true when captcha passes', async () => {
      const recaptcha = makeRecaptcha();
      recaptcha.verify.mockResolvedValue(true);
      const { context, reflector } = makeContext({
        headers: { 'x-recaptcha-token': 'token-123', 'x-recaptcha-action': 'submit' },
        reflectorMeta: { [IS_PUBLIC_KEY]: true, [IGNORE_CAPTCHA]: false },
      });
      const parts = buildGuard({ recaptcha });
      const guard = createGuard(parts, reflector);

      const result = await guard.canActivate(context as any);

      expect(recaptcha.verify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('returns false when captcha fails', async () => {
      const recaptcha = makeRecaptcha();
      recaptcha.verify.mockResolvedValue(false);
      const { context, reflector } = makeContext({
        headers: { 'x-recaptcha-token': 'bad', 'x-recaptcha-action': 'submit' },
        reflectorMeta: { [IS_PUBLIC_KEY]: true, [IGNORE_CAPTCHA]: false },
      });
      const parts = buildGuard({ recaptcha });
      const guard = createGuard(parts, reflector);

      const result = await guard.canActivate(context as any);

      expect(result).toBe(false);
    });

    it('throws UnauthorizedException when captcha headers are missing', async () => {
      const { context, reflector } = makeContext({
        headers: {},
        reflectorMeta: { [IS_PUBLIC_KEY]: true, [IGNORE_CAPTCHA]: false },
      });
      const parts = buildGuard();
      const guard = createGuard(parts, reflector);

      await expect(guard.canActivate(context as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JWT authentication', () => {
    it('verifies a Bearer token and sets request.user', async () => {
      const jwtVerifier = makeJwtVerifier();
      const authUser = { type: 'jwt', idpSub: 'user|abc', permissions: [] };
      jwtVerifier.verify.mockResolvedValue(authUser);
      const { context, reflector, request } = makeContext({
        headers: { authorization: 'Bearer valid-jwt-token' },
        reflectorMeta: { [IS_PUBLIC_KEY]: false },
      });
      const parts = buildGuard({ jwtVerifier });
      const guard = createGuard(parts, reflector);

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
      expect(request.user).toEqual(authUser);
    });

    it('throws UnauthorizedException when the Bearer token is invalid', async () => {
      const jwtVerifier = makeJwtVerifier();
      jwtVerifier.verify.mockRejectedValue(new Error('invalid signature'));
      const { context, reflector } = makeContext({
        headers: { authorization: 'Bearer bad-jwt-token' },
        reflectorMeta: { [IS_PUBLIC_KEY]: false },
      });
      const parts = buildGuard({ jwtVerifier });
      const guard = createGuard(parts, reflector);

      await expect(guard.canActivate(context as any)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no token is present', async () => {
      const { context, reflector } = makeContext({
        headers: {},
        reflectorMeta: { [IS_PUBLIC_KEY]: false },
      });
      const parts = buildGuard();
      const guard = createGuard(parts, reflector);

      await expect(guard.canActivate(context as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('API key authentication', () => {
    it('validates an x-api-key header and sets request.user', async () => {
      const apiKeyVerifier = makeApiKeyVerifier();
      const authUser = { type: 'apikey', idpSub: 'apikey:key-id-1', permissions: [] };
      apiKeyVerifier.validate.mockResolvedValue(authUser);
      const { context, reflector, request } = makeContext({
        headers: { 'x-api-key': 'sk_kid_rawtoken' },
        reflectorMeta: { [IS_PUBLIC_KEY]: false },
      });
      const parts = buildGuard({ apiKeyVerifier });
      const guard = createGuard(parts, reflector);

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
      expect(request.user).toEqual(authUser);
      expect(apiKeyVerifier.validate).toHaveBeenCalledWith('sk_kid_rawtoken');
    });

    it('validates Authorization: ApiKey header', async () => {
      const apiKeyVerifier = makeApiKeyVerifier();
      const authUser = { type: 'apikey', idpSub: 'apikey:key-id-1', permissions: [] };
      apiKeyVerifier.validate.mockResolvedValue(authUser);
      const { context, reflector } = makeContext({
        headers: { authorization: 'ApiKey sk_kid_rawtoken' },
        reflectorMeta: { [IS_PUBLIC_KEY]: false },
      });
      const parts = buildGuard({ apiKeyVerifier });
      const guard = createGuard(parts, reflector);

      const result = await guard.canActivate(context as any);

      expect(result).toBe(true);
      expect(apiKeyVerifier.validate).toHaveBeenCalledWith('sk_kid_rawtoken');
    });

    it('@UseApiKey() forces API key validation even when Bearer is present', async () => {
      const apiKeyVerifier = makeApiKeyVerifier();
      const authUser = { type: 'apikey', idpSub: 'apikey:key-id-1', permissions: [] };
      apiKeyVerifier.validate.mockResolvedValue(authUser);
      const { context, reflector } = makeContext({
        headers: {
          authorization: 'Bearer valid-jwt',
          'x-api-key': 'sk_kid_rawtoken',
        },
        reflectorMeta: { [IS_PUBLIC_KEY]: false, [USE_API_KEY]: true },
      });
      const parts = buildGuard({ apiKeyVerifier });
      const guard = createGuard(parts, reflector);

      await guard.canActivate(context as any);

      expect(apiKeyVerifier.validate).toHaveBeenCalled();
      expect(parts.jwtVerifier.verify).not.toHaveBeenCalled();
    });

    it('fires MarkApiKeyUsedCommand in background on successful API key auth', async () => {
      const apiKeyVerifier = makeApiKeyVerifier();
      const commandBus = makeCommandBus();
      const authUser = { type: 'apikey', idpSub: 'apikey:key-id-1', permissions: [] };
      apiKeyVerifier.validate.mockResolvedValue(authUser);
      const { context, reflector } = makeContext({
        headers: { 'x-api-key': 'sk_kid_rawtoken' },
        reflectorMeta: { [IS_PUBLIC_KEY]: false },
      });
      const parts = buildGuard({ apiKeyVerifier, commandBus });
      const guard = createGuard(parts, reflector);

      await guard.canActivate(context as any);

      // Allow the fire-and-forget promise to settle
      await new Promise((r) => setTimeout(r, 0));
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });
  });
});
