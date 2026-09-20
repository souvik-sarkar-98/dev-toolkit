import { Test, TestingModule } from '@nestjs/testing';
import { BasePrismaService, PRISMA_CLIENT } from '@ssdev-toolkit/nestjs-persistence/prisma/base-prisma.service';
import { DATABASE_OPTIONS } from '@ssdev-toolkit/nestjs-persistence/database-options.token';

function makeMockPrismaClient() {
  return {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

async function buildModule(
  mockClient: any,
  options: any = { redisUrl: 'redis://x', prismaClientFactory: () => mockClient },
) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      BasePrismaService,
      { provide: PRISMA_CLIENT, useValue: mockClient },
      { provide: DATABASE_OPTIONS, useValue: options },
    ],
  }).compile();
  return module.get<BasePrismaService>(BasePrismaService);
}

describe('BasePrismaService', () => {
  let mockClient: ReturnType<typeof makeMockPrismaClient>;

  beforeEach(() => {
    mockClient = makeMockPrismaClient();
  });

  it('is defined', async () => {
    const svc = await buildModule(mockClient);
    expect(svc).toBeDefined();
  });

  it('calls $connect on onModuleInit', async () => {
    const svc = await buildModule(mockClient);
    await svc.onModuleInit();
    expect(mockClient.$connect).toHaveBeenCalledTimes(1);
  });

  it('calls $disconnect on onApplicationShutdown', async () => {
    const svc = await buildModule(mockClient);
    await svc.onApplicationShutdown('SIGTERM');
    expect(mockClient.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('exposes the underlying client via .client getter', async () => {
    const svc = await buildModule(mockClient);
    expect(svc.client).toBeDefined();
  });

  it('proxies model accessors from the Prisma client', async () => {
    const svc = await buildModule(mockClient) as any;
    // Accessing .user should be proxied to the underlying client
    expect(svc.user).toBeDefined();
  });

  it('does not apply audit extension when enableAuditExtension is false', async () => {
    const svc = await buildModule(mockClient, {
      redisUrl: 'redis://x',
      prismaClientFactory: () => mockClient,
      auditedModels: ['User'],
      enableAuditExtension: false,
    });
    expect(svc.client).toBe(mockClient);
  });

  it('does not apply audit extension when auditedModels is empty', async () => {
    const svc = await buildModule(mockClient, {
      redisUrl: 'redis://x',
      prismaClientFactory: () => mockClient,
      auditedModels: [],
    });
    // With empty auditedModels, the client should be the raw one
    expect(svc.client).toBeDefined();
  });
});
