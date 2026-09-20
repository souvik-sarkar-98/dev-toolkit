/**
 * GmailEmailAdapter unit tests.
 * Mocks the Google Gmail API client and IOAuthAccessTokenPort.
 */

jest.mock('axios', () => ({}), { virtual: true });
jest.mock('@nestjs/axios', () => ({ HttpModule: class { }, HttpService: class { } }), {
  virtual: true,
});

jest.mock('@googleapis/gmail', () => {
  const mockSend = jest.fn().mockResolvedValue({ data: { id: 'msg-1' } });
  return {
    gmail: jest.fn().mockReturnValue({
      users: { messages: { send: mockSend } },
    }),
    __mockSend: mockSend,
  };
});

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
  })),
}));

import { Logger } from '@nestjs/common';
import { GmailEmailAdapter } from '@ssdev-toolkit/nestjs-correspondence/infrastructure/email/gmail-email.adapter';

function getGmailMocks() {
  const mod = require('@googleapis/gmail');
  return {
    gmailFn: mod.gmail as jest.Mock,
    mockSend: mod.__mockSend as jest.Mock,
  };
}

const moduleOptions = {
  appName: 'TestApp',
  environment: 'test',
  email: { fromAddress: 'noreply@test.com', fromName: 'Test App' },
};

function makeOAuthPort(accessToken = 'fake-token') {
  return { getAccessToken: jest.fn().mockResolvedValue(accessToken) };
}

describe('GmailEmailAdapter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
    const { gmailFn, mockSend } = getGmailMocks();
    gmailFn.mockClear();
    mockSend.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends an email via gmail.users.messages.send', async () => {
    const { mockSend } = getGmailMocks();
    const adapter = new GmailEmailAdapter(makeOAuthPort() as any, moduleOptions as any);
    await adapter.send({ to: ['recipient@test.com'], subject: 'Hello', html: '<p>Hello</p>' });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('obtains an access token from IOAuthAccessTokenPort', async () => {
    const oauthPort = makeOAuthPort();
    const adapter = new GmailEmailAdapter(oauthPort as any, moduleOptions as any);
    await adapter.send({ to: ['r@test.com'], subject: 'S', html: '<p></p>' });
    expect(oauthPort.getAccessToken).toHaveBeenCalledWith({
      provider: 'google',
      scope: 'https://www.googleapis.com/auth/gmail.send',
    });
  });

  it('passes raw base64 message in requestBody', async () => {
    const { mockSend } = getGmailMocks();
    const adapter = new GmailEmailAdapter(makeOAuthPort() as any, moduleOptions as any);
    await adapter.send({ to: ['r@test.com'], subject: 'S', html: '<p>Hi</p>' });
    const [{ requestBody }] = mockSend.mock.calls[0];
    expect(requestBody).toHaveProperty('raw');
    expect(typeof requestBody.raw).toBe('string');
  });

  it('calls send with userId="me"', async () => {
    const { mockSend } = getGmailMocks();
    const adapter = new GmailEmailAdapter(makeOAuthPort() as any, moduleOptions as any);
    await adapter.send({ to: ['r@test.com'], subject: 'S', html: '<p></p>' });
    const [args] = mockSend.mock.calls[0];
    expect(args.userId).toBe('me');
  });
});
