import { RequestMethod } from '@nestjs/common';
import { applyConfig } from '@ssdev-toolkit/nestjs-core';

// Mock swagger separately since it's a peer dep
jest.mock('@ssdev-toolkit/nestjs-core/presentation/config/swagger.config', () => ({
  configureSwagger: jest.fn(),
}));

function makeMockApp() {
  const expressInstance = { set: jest.fn() };
  return {
    use: jest.fn(),
    useGlobalPipes: jest.fn(),
    useGlobalFilters: jest.fn(),
    useGlobalInterceptors: jest.fn(),
    useLogger: jest.fn(),
    setGlobalPrefix: jest.fn(),
    enableCors: jest.fn(),
    enableShutdownHooks: jest.fn(),
    getHttpAdapter: jest.fn().mockReturnValue({
      getInstance: jest.fn().mockReturnValue(expressInstance),
    }),
    __expressInstance: expressInstance,
    get: jest.fn().mockReturnValue({
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }),
  };
}

describe('applyConfig()', () => {
  let app: ReturnType<typeof makeMockApp>;

  beforeEach(() => {
    app = makeMockApp();
  });

  it('calls app.use() at least twice (trace middleware + compression + body-parser)', () => {
    applyConfig(app as any);
    expect(app.use.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('calls useGlobalPipes once with a ValidationPipe instance', () => {
    applyConfig(app as any);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.useGlobalPipes.mock.calls[0][0]).toBeDefined();
  });

  it('applies the default global prefix "api"', () => {
    applyConfig(app as any);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api', { exclude: [] });
  });

  it('applies a custom global prefix', () => {
    applyConfig(app as any, { globalPrefix: 'v2' });
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('v2', expect.anything());
  });

  it('passes globalPrefixExclusions to setGlobalPrefix', () => {
    const exclusions = [{ path: '/health', method: RequestMethod.GET }];
    applyConfig(app as any, { globalPrefixExclusions: exclusions });
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api', { exclude: exclusions });
  });

  it('calls enableCors with provided origins', () => {
    applyConfig(app as any, { corsOrigins: ['https://app.example.com'] });
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: ['https://app.example.com'] }),
    );
  });

  it('does NOT enable CORS when corsOrigins is not provided (secure default)', () => {
    applyConfig(app as any);
    expect(app.enableCors).not.toHaveBeenCalled();
  });

  it('does not combine credentials with a wildcard origin', () => {
    expect(() =>
      applyConfig(app as any, { corsOrigins: '*', corsCredentials: true }),
    ).toThrow(/wildcard/i);
  });

  it('enables CORS without credentials by default when origins are provided', () => {
    applyConfig(app as any, { corsOrigins: ['https://app.example.com'] });
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: false }),
    );
  });

  it('does not imperatively register interceptors (delegated to CoreModule DI)', () => {
    applyConfig(app as any, { environment: 'development' });
    expect(app.useGlobalInterceptors).not.toHaveBeenCalled();
  });

  it('does not imperatively register interceptors in production either (delegated to CoreModule DI)', () => {
    applyConfig(app as any, { environment: 'prod' });
    expect(app.useGlobalInterceptors).not.toHaveBeenCalled();
  });

  it('calls enableShutdownHooks', () => {
    applyConfig(app as any);
    expect(app.enableShutdownHooks).toHaveBeenCalledTimes(1);
  });

  it('does not imperatively register a global exception filter (delegated to CoreModule DI)', () => {
    applyConfig(app as any);
    expect(app.useGlobalFilters).not.toHaveBeenCalled();
  });

  describe('trustProxy', () => {
    it('does NOT set trust proxy by default', () => {
      applyConfig(app as any);
      expect(app.__expressInstance.set).not.toHaveBeenCalledWith(
        'trust proxy',
        expect.anything(),
      );
    });

    it('sets trust proxy on the Express instance when provided', () => {
      applyConfig(app as any, { trustProxy: 1 });
      expect(app.__expressInstance.set).toHaveBeenCalledWith('trust proxy', 1);
    });

    it('supports boolean and list values', () => {
      applyConfig(app as any, { trustProxy: true });
      expect(app.__expressInstance.set).toHaveBeenCalledWith(
        'trust proxy',
        true,
      );

      const app2 = makeMockApp();
      applyConfig(app2 as any, { trustProxy: ['10.0.0.0/8', 'loopback'] });
      expect(app2.__expressInstance.set).toHaveBeenCalledWith('trust proxy', [
        '10.0.0.0/8',
        'loopback',
      ]);
    });

    it('does not throw when the adapter does not support set()', () => {
      const adapterless = makeMockApp();
      adapterless.getHttpAdapter = jest
        .fn()
        .mockReturnValue({ getInstance: jest.fn().mockReturnValue({}) });
      expect(() =>
        applyConfig(adapterless as any, { trustProxy: 1 }),
      ).not.toThrow();
    });
  });
});
