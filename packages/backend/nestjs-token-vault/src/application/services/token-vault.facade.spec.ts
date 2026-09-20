import { TokenVaultFacade } from '@ssdev-toolkit/nestjs-token-vault/application/services/token-vault.facade';
import { GetValidTokenQuery } from '@ssdev-toolkit/nestjs-token-vault/application/queries/get-valid-token/get-valid-token.query';
import { InitiateOAuthCommand } from '@ssdev-toolkit/nestjs-token-vault/application/commands/initiate-oauth/initiate-oauth.command';

const makeQueryBus = (result?: any) => ({
  execute: jest.fn().mockResolvedValue(result ?? 'decrypted-access-token'),
});

const makeCommandBus = (result?: any) => ({
  execute: jest.fn().mockResolvedValue(result ?? { url: 'https://auth.example.com?state=abc', state: 'abc' }),
});

function makeFacade(queryBus?: any, commandBus?: any): TokenVaultFacade {
  return new TokenVaultFacade(queryBus ?? makeQueryBus(), commandBus ?? makeCommandBus());
}

describe('TokenVaultFacade', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAccessToken()', () => {
    it('delegates to QueryBus with a GetValidTokenQuery', async () => {
      const queryBus = makeQueryBus('my-access-token');
      const facade = makeFacade(queryBus);

      const result = await facade.getAccessToken({ provider: 'google', scope: 'openid' });

      expect(result).toBe('my-access-token');
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetValidTokenQuery));
    });

    it('passes all selector options to the query', async () => {
      const queryBus = makeQueryBus();
      const facade = makeFacade(queryBus);

      await facade.getAccessToken({
        provider: 'google',
        scope: 'gmail.send',
        email: 'user@example.com',
        ownerSub: 'sub-123',
        tokenId: 'token-uuid',
      });

      const query: GetValidTokenQuery = queryBus.execute.mock.calls[0][0];
      expect(query.params.provider).toBe('google');
      expect(query.params.scope).toBe('gmail.send');
      expect(query.params.email).toBe('user@example.com');
      expect(query.params.ownerSub).toBe('sub-123');
      expect(query.params.tokenId).toBe('token-uuid');
    });

    it('returns the string result from the query bus', async () => {
      const queryBus = makeQueryBus('resolved-token-value');
      const facade = makeFacade(queryBus);
      const result = await facade.getAccessToken({ provider: 'google' });
      expect(result).toBe('resolved-token-value');
    });
  });

  describe('getAuthorizationUrl()', () => {
    it('delegates to CommandBus with an InitiateOAuthCommand', async () => {
      const commandBus = makeCommandBus({ url: 'https://auth.example.com', state: 'state-abc' });
      const facade = makeFacade(undefined, commandBus);

      const result = await facade.getAuthorizationUrl({
        provider: 'google',
        scopes: ['openid', 'email'],
        ownerSub: 'user-sub',
      });

      expect(result.url).toBe('https://auth.example.com');
      expect(result.state).toBe('state-abc');
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(InitiateOAuthCommand));
    });

    it('passes provider, scopes and ownerSub to the command', async () => {
      const commandBus = makeCommandBus();
      const facade = makeFacade(undefined, commandBus);

      await facade.getAuthorizationUrl({
        provider: 'microsoft',
        scopes: ['openid', 'Mail.Send'],
        ownerSub: 'sub-xyz',
      });

      const command: InitiateOAuthCommand = commandBus.execute.mock.calls[0][0];
      expect(command.params.provider).toBe('microsoft');
      expect(command.params.scopes).toEqual(['openid', 'Mail.Send']);
      expect(command.params.ownerSub).toBe('sub-xyz');
    });

    it('works without ownerSub', async () => {
      const commandBus = makeCommandBus({ url: 'https://auth.example.com', state: 'state' });
      const facade = makeFacade(undefined, commandBus);

      await expect(
        facade.getAuthorizationUrl({ provider: 'google', scopes: ['openid'] }),
      ).resolves.toBeTruthy();

      const command: InitiateOAuthCommand = commandBus.execute.mock.calls[0][0];
      expect(command.params.ownerSub).toBeUndefined();
    });
  });
});
