import { ListTokensHandler } from '@ssdev-toolkit/nestjs-token-vault/application/queries/list-tokens/list-tokens.handler';
import { ListTokensQuery } from '@ssdev-toolkit/nestjs-token-vault/application/queries/list-tokens/list-tokens.query';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';
const FUTURE = new Date(Date.now() + 3_600_000);

async function buildToken(email: string): Promise<OAuthToken> {
  const access = await EncryptedToken.fromPlaintext('access', SECRET);
  return OAuthToken.create({
    accountId: 'account-1',
    clientId: 'client-1',
    provider: 'google',
    email,
    ownerSub: 'sub-123',
    accessToken: access,
    expiresAt: FUTURE,
    tokenType: 'Bearer',
  });
}

function makeRepo(content: OAuthToken[] = [], total = 0) {
  return {
    findPaged: jest.fn().mockResolvedValue({
      content,
      totalSize: total || content.length,
      pageIndex: 0,
      pageSize: 20,
    }),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByAttribute: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

describe('ListTokensHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty page when no tokens exist', async () => {
    const repo = makeRepo([], 0);
    const handler = new ListTokensHandler(repo as any);
    const result = await handler.execute(new ListTokensQuery({ pageIndex: 0, pageSize: 20 }));

    expect(result.content).toHaveLength(0);
    expect(result.totalSize).toBe(0);
  });

  it('maps tokens to DTOs (no accessToken in DTO)', async () => {
    const token = await buildToken('user@example.com');
    const repo = makeRepo([token]);
    const handler = new ListTokensHandler(repo as any);

    const result = await handler.execute(new ListTokensQuery({ pageIndex: 0, pageSize: 20 }));

    expect(result.content).toHaveLength(1);
    const dto = result.content[0];
    expect(dto.id).toBe(token.id);
    expect(dto.provider).toBe('google');
    expect(dto.email).toBe('user@example.com');
    // Access token must never appear in DTO
    expect((dto as any).accessToken).toBeUndefined();
    expect((dto as any).refreshToken).toBeUndefined();
  });

  it('passes pageIndex and pageSize to the repository', async () => {
    const repo = makeRepo();
    const handler = new ListTokensHandler(repo as any);

    await handler.execute(new ListTokensQuery({ pageIndex: 3, pageSize: 15 }));

    expect(repo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ pageIndex: 3, pageSize: 15 }),
    );
  });

  it('forwards provider filter to the repository', async () => {
    const repo = makeRepo();
    const handler = new ListTokensHandler(repo as any);

    await handler.execute(new ListTokensQuery({ provider: 'google', pageIndex: 0, pageSize: 10 }));

    expect(repo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ provider: 'google' }) }),
    );
  });

  it('forwards account filter to the repository', async () => {
    const repo = makeRepo();
    const handler = new ListTokensHandler(repo as any);

    await handler.execute(new ListTokensQuery({
      provider: 'google',
      account: 'user@example.com',
      pageIndex: 0,
      pageSize: 10,
    }));

    expect(repo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ account: 'user@example.com' }) }),
    );
  });

  it('scopes non-admin queries to the caller ownerSub', async () => {
    const repo = makeRepo();
    const handler = new ListTokensHandler(repo as any);

    await handler.execute(
      new ListTokensQuery({ ownerSub: 'sub-abc', isAdmin: false, pageIndex: 0, pageSize: 20 }),
    );

    expect(repo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ ownerSub: 'sub-abc' }) }),
    );
  });

  it('does not inject ownerSub filter for admin queries', async () => {
    const repo = makeRepo();
    const handler = new ListTokensHandler(repo as any);

    await handler.execute(
      new ListTokensQuery({ ownerSub: 'sub-abc', isAdmin: true, pageIndex: 0, pageSize: 20 }),
    );

    const call = repo.findPaged.mock.calls[0][0];
    expect(call.props?.ownerSub).toBeUndefined();
  });

  it('uses default pageIndex=0 and pageSize=20 when not provided', async () => {
    const repo = makeRepo();
    const handler = new ListTokensHandler(repo as any);

    await handler.execute(new ListTokensQuery({}));

    expect(repo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ pageIndex: 0, pageSize: 20 }),
    );
  });
});
