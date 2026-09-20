/**
 * OneSignalPushAdapter unit tests.
 * Mocks @onesignal/node-onesignal to verify payload construction.
 */

// Mock axios and @nestjs/axios to avoid missing peer dependency in transitive imports
jest.mock('axios', () => ({}), { virtual: true });
jest.mock('@nestjs/axios', () => ({ HttpModule: class { }, HttpService: class { } }), {
  virtual: true,
});

import { Logger } from '@nestjs/common';

// ── OneSignal mock ────────────────────────────────────────────────────────
// Note: Notification mock must NOT return a new object — it must rely on the
// implicit `this` so that jest.mock.instances[0] tracks the same object the
// adapter mutates (e.g. notification.app_id = ...).
jest.mock('@onesignal/node-onesignal', () => {
  const mockCreateNotification = jest.fn().mockResolvedValue({ id: 'onesignal-notif-1' });
  const MockDefaultApi = jest.fn().mockImplementation(() => ({
    createNotification: mockCreateNotification,
  }));
  // Do NOT return a plain object from mockImplementation — that creates a separate object
  // from 'this', so property assignments after construction would be lost in mock.instances.
  const MockNotification = jest.fn(); // no implementation → uses 'this' automatically
  return {
    createConfiguration: jest.fn().mockReturnValue({}),
    DefaultApi: MockDefaultApi,
    Notification: MockNotification,
    __mockCreateNotification: mockCreateNotification,
  };
});

import { OneSignalPushAdapter } from '@ssdev-toolkit/nestjs-correspondence/infrastructure/push/onesignal-push.adapter';
import { PushNotificationPayload } from '@ssdev-toolkit/nestjs-correspondence/domain/ports/push-notification.port';
import * as OneSignal from '@onesignal/node-onesignal';

// ── Helpers ────────────────────────────────────────────────────────────────

function getOneSignalMocks() {
  const mod = OneSignal as any;
  return {
    MockNotification: mod.Notification as jest.Mock,
    mockCreateNotification: mod.__mockCreateNotification as jest.Mock,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

const options = {
  push: { oneSignal: { appId: 'app-123', apiKey: 'key-456' } },
};

describe('OneSignalPushAdapter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
    const { MockNotification, mockCreateNotification } = getOneSignalMocks();
    MockNotification.mockClear();
    mockCreateNotification.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('calls createNotification with the OneSignal Notification object', async () => {
    const { mockCreateNotification } = getOneSignalMocks();
    const adapter = new OneSignalPushAdapter(options as any);
    const payload: PushNotificationPayload = { userIds: ['u1', 'u2'], title: 'Hello', body: 'World' };
    await adapter.send(payload);
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
  });

  it('sets app_id on the notification', async () => {
    const { MockNotification } = getOneSignalMocks();
    const adapter = new OneSignalPushAdapter(options as any);
    await adapter.send({ userIds: ['u1'], title: 'T', body: 'B' });
    const notifInstance = MockNotification.mock.instances[0] as any;
    expect(notifInstance.app_id).toBe('app-123');
  });

  it('sets target_channel to push', async () => {
    const { MockNotification } = getOneSignalMocks();
    const adapter = new OneSignalPushAdapter(options as any);
    await adapter.send({ userIds: ['u1'], title: 'T', body: 'B' });
    const notifInstance = MockNotification.mock.instances[0] as any;
    expect(notifInstance.target_channel).toBe('push');
  });

  it('sets include_aliases with external_id from userIds', async () => {
    const { MockNotification } = getOneSignalMocks();
    const adapter = new OneSignalPushAdapter(options as any);
    await adapter.send({ userIds: ['u1', 'u2'], title: 'T', body: 'B' });
    const notifInstance = MockNotification.mock.instances[0] as any;
    expect(notifInstance.include_aliases).toEqual({ external_id: ['u1', 'u2'] });
  });

  it('sets headings and contents in English', async () => {
    const { MockNotification } = getOneSignalMocks();
    const adapter = new OneSignalPushAdapter(options as any);
    await adapter.send({ userIds: ['u1'], title: 'My Title', body: 'My Body' });
    const notifInstance = MockNotification.mock.instances[0] as any;
    expect(notifInstance.headings).toEqual({ en: 'My Title' });
    expect(notifInstance.contents).toEqual({ en: 'My Body' });
  });

  it('skips sending when userIds is empty', async () => {
    const { mockCreateNotification } = getOneSignalMocks();
    const adapter = new OneSignalPushAdapter(options as any);
    await adapter.send({ userIds: [], title: 'T', body: 'B' });
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('sets imageUrl on chrome_web_image and big_picture when provided', async () => {
    const { MockNotification } = getOneSignalMocks();
    const adapter = new OneSignalPushAdapter(options as any);
    await adapter.send({
      userIds: ['u1'],
      title: 'T',
      body: 'B',
      imageUrl: 'https://img.test.com/img.png',
    });
    const notifInstance = MockNotification.mock.instances[0] as any;
    expect(notifInstance.chrome_web_image).toBe('https://img.test.com/img.png');
    expect(notifInstance.big_picture).toBe('https://img.test.com/img.png');
  });

  it('sets web_url when data.actionUrl is provided', async () => {
    const { MockNotification } = getOneSignalMocks();
    const adapter = new OneSignalPushAdapter(options as any);
    await adapter.send({
      userIds: ['u1'],
      title: 'T',
      body: 'B',
      data: { actionUrl: 'https://app.test.com/task/1' },
    });
    const notifInstance = MockNotification.mock.instances[0] as any;
    expect(notifInstance.web_url).toBe('https://app.test.com/task/1');
  });
});
