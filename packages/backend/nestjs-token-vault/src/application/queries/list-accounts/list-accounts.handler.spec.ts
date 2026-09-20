import { ListAccountsHandler } from '@ssdev-toolkit/nestjs-token-vault/application/queries/list-accounts/list-accounts.handler';
import { ListAccountsQuery } from '@ssdev-toolkit/nestjs-token-vault/application/queries/list-accounts/list-accounts.query';
import { OAuthAccount } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-account/oauth-account.aggregate';

function buildAccount(email: string, provider = 'google'): OAuthAccount {
  return OAuthAccount.create(provider, { email, name: 'Test User' });
}

function makeRepo(content: OAuthAccount[] = [], total = 0) {
  return {
    findPaged: jest.fn().mockResolvedValue({
      content,
      totalSize: total || content.length,
      pageIndex: 0,
      pageSize: 20,
    }),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByProviderAndEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

describe('ListAccountsHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty page when no accounts exist', async () => {
    const repo = makeRepo();
    const handler = new ListAccountsHandler(repo as any);
    const result = await handler.execute(new ListAccountsQuery({ pageIndex: 0, pageSize: 20 }));
    expect(result.content).toHaveLength(0);
    expect(result.totalSize).toBe(0);
  });

  it('maps accounts to DTOs', async () => {
    const account = buildAccount('user@example.com');
    const repo = makeRepo([account]);
    const handler = new ListAccountsHandler(repo as any);

    const result = await handler.execute(new ListAccountsQuery({ pageIndex: 0, pageSize: 20 }));

    expect(result.content).toHaveLength(1);
    const dto = result.content[0];
    expect(dto.id).toBe(account.id);
    expect(dto.email).toBe('user@example.com');
    expect(dto.provider).toBe('google');
  });

  it('passes pageIndex and pageSize to the repository', async () => {
    const repo = makeRepo();
    const handler = new ListAccountsHandler(repo as any);

    await handler.execute(new ListAccountsQuery({ pageIndex: 2, pageSize: 10 }));

    expect(repo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ pageIndex: 2, pageSize: 10 }),
    );
  });

  it('forwards provider filter to the repository', async () => {
    const repo = makeRepo();
    const handler = new ListAccountsHandler(repo as any);

    await handler.execute(new ListAccountsQuery({ provider: 'microsoft', pageIndex: 0, pageSize: 20 }));

    expect(repo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ provider: 'microsoft' }) }),
    );
  });

  it('uses default pageIndex=0 and pageSize=20 when not provided', async () => {
    const repo = makeRepo();
    const handler = new ListAccountsHandler(repo as any);

    await handler.execute(new ListAccountsQuery({}));

    expect(repo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ pageIndex: 0, pageSize: 20 }),
    );
  });

  it('returns correct totalSize from repository', async () => {
    const accounts = [buildAccount('a@e.com'), buildAccount('b@e.com')];
    const repo = makeRepo(accounts, 100);
    const handler = new ListAccountsHandler(repo as any);

    const result = await handler.execute(new ListAccountsQuery({ pageIndex: 0, pageSize: 20 }));

    expect(result.totalSize).toBe(100);
    expect(result.content).toHaveLength(2);
  });
});
