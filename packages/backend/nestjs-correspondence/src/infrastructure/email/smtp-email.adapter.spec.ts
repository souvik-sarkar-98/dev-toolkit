/**
 * SmtpEmailAdapter unit tests.
 * Mocks nodemailer to verify SMTP transport is called with correct options.
 *
 * Note: mock functions are defined INSIDE jest.mock() factory to avoid
 * the temporal-dead-zone error caused by jest.mock() hoisting.
 */

// Mock axios and @nestjs/axios to avoid missing peer dependency in transitive imports
// (smtp-email.adapter imports correspondence.module which chains to @nestjs/axios)
jest.mock('axios', () => ({}), { virtual: true });
jest.mock('@nestjs/axios', () => ({ HttpModule: class { }, HttpService: class { } }), {
  virtual: true,
});

// Mock nodemailer inside its factory — avoids const/let TDZ hoisting issue.
jest.mock('nodemailer', () => {
  const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'smtp-msg-1' });
  const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });
  return {
    createTransport: mockCreateTransport,
    __mockSendMail: mockSendMail,
    __mockCreateTransport: mockCreateTransport,
  };
});

import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SmtpEmailAdapter } from '@ssdev-toolkit/nestjs-correspondence/infrastructure/email/smtp-email.adapter';
import { EmailDeliveryFailedError } from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';

// ── Helpers ────────────────────────────────────────────────────────────────

function getNodemailerMocks() {
  const mod = nodemailer as any;
  return {
    createTransport: mod.__mockCreateTransport as jest.Mock,
    sendMail: mod.__mockSendMail as jest.Mock,
  };
}

const smtpOptions = {
  appName: 'TestApp',
  email: {
    fromAddress: 'sender@test.com',
    fromName: 'Sender',
    smtp: { host: 'smtp.test.com', port: 587, secure: false },
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SmtpEmailAdapter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
    const { createTransport, sendMail } = getNodemailerMocks();
    createTransport.mockClear();
    sendMail.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates a nodemailer transporter with host, port, and secure from options', async () => {
    const { createTransport } = getNodemailerMocks();
    const adapter = new SmtpEmailAdapter(smtpOptions as any);
    await adapter.send({ to: ['r@test.com'], subject: 'S', html: '<p></p>' });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.test.com', port: 587, secure: false }),
    );
  });

  it('calls sendMail with correct to, subject, html', async () => {
    const { sendMail } = getNodemailerMocks();
    const adapter = new SmtpEmailAdapter(smtpOptions as any);
    await adapter.send({ to: ['r@test.com'], subject: 'Hello', html: '<p>Hi</p>' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['r@test.com'], subject: 'Hello', html: '<p>Hi</p>' }),
    );
  });

  it('calls sendMail with cc and bcc when provided', async () => {
    const { sendMail } = getNodemailerMocks();
    const adapter = new SmtpEmailAdapter(smtpOptions as any);
    await adapter.send({
      to: ['to@test.com'],
      cc: ['cc@test.com'],
      bcc: ['bcc@test.com'],
      subject: 'S',
      html: '<p></p>',
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ cc: ['cc@test.com'], bcc: ['bcc@test.com'] }),
    );
  });

  it('throws EmailDeliveryFailedError when SMTP host is missing', async () => {
    const noHostOptions = {
      appName: 'TestApp',
      email: { fromAddress: 'sender@test.com', smtp: {} },
    };
    const adapter = new SmtpEmailAdapter(noHostOptions as any);
    await expect(
      adapter.send({ to: ['r@test.com'], subject: 'S', html: '<p></p>' }),
    ).rejects.toThrow(EmailDeliveryFailedError);
  });

  it('reuses the same transporter on multiple calls (lazy init)', async () => {
    const { createTransport } = getNodemailerMocks();
    const adapter = new SmtpEmailAdapter(smtpOptions as any);
    await adapter.send({ to: ['r@test.com'], subject: 'S', html: '<p></p>' });
    await adapter.send({ to: ['r2@test.com'], subject: 'S2', html: '<p></p>' });
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it('uses fromName and fromAddress in the from field', async () => {
    const { sendMail } = getNodemailerMocks();
    const adapter = new SmtpEmailAdapter(smtpOptions as any);
    await adapter.send({ to: ['r@test.com'], subject: 'S', html: '<p></p>' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.stringContaining('sender@test.com') }),
    );
  });

  it('uses auth credentials when smtp user/password provided', async () => {
    const { createTransport } = getNodemailerMocks();
    const withAuthOptions = {
      ...smtpOptions,
      email: {
        ...smtpOptions.email,
        smtp: { host: 'smtp.test.com', port: 587, secure: false, user: 'u', password: 'p' },
      },
    };
    const adapter = new SmtpEmailAdapter(withAuthOptions as any);
    await adapter.send({ to: ['r@test.com'], subject: 'S', html: '<p></p>' });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: 'u', pass: 'p' } }),
    );
  });
});
