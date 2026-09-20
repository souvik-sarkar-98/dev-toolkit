import 'reflect-metadata';
import { OnApiKeyRevokedHandler } from './on-api-key-revoked.handler';
import { ApiKeyRevokedEvent, type ApiKeyRevokedSnapshot } from '../../../../domain/events/api-key-revoked.event';
import { ApiKey } from '../../../../domain/aggregates/api-key/api-key.aggregate';

const makeVerifier = () => ({ invalidate: jest.fn().mockResolvedValue(undefined), validate: jest.fn() });

function makeApiKey(keyId = 'abc123'): ApiKey {
  return new ApiKey({
    id: 'key-id-1',
    key: 'hashed',
    keyId,
    name: 'test-key',
    permissions: [],
  });
}

describe('OnApiKeyRevokedHandler', () => {
  let verifier: ReturnType<typeof makeVerifier>;
  let handler: OnApiKeyRevokedHandler;

  beforeEach(() => {
    verifier = makeVerifier();
    handler = new OnApiKeyRevokedHandler(verifier as any);
  });

  it('calls apiKeyVerifier.invalidate with the correct keyId', async () => {
    const apiKey = makeApiKey('my-key-id');
    const event = new ApiKeyRevokedEvent(apiKey.toSnapshot<ApiKeyRevokedSnapshot>());

    await handler.handle(event);

    expect(verifier.invalidate).toHaveBeenCalledWith('my-key-id');
    expect(verifier.invalidate).toHaveBeenCalledTimes(1);
  });

  it('awaits the invalidate call', async () => {
    const apiKey = makeApiKey('kid-1');
    let resolved = false;
    verifier.invalidate.mockImplementation(() =>
      new Promise<void>((r) => setTimeout(() => { resolved = true; r(); }, 0)),
    );

    await handler.handle(new ApiKeyRevokedEvent(apiKey.toSnapshot<ApiKeyRevokedSnapshot>()));

    expect(resolved).toBe(true);
  });
});
