import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from '@ssdev-toolkit/nestjs-core';
import { BusinessException } from '@ssdev-toolkit/nestjs-core';
import { ThrottlerException } from '@nestjs/throttler';

function makeHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/x', method: 'GET', headers: {} }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('GlobalExceptionFilter', () => {
  describe('production sanitisation (environment="prod")', () => {
    const filter = new GlobalExceptionFilter(undefined, 'prod');

    it('hides stack trace and masks unknown 5xx messages', () => {
      const { host, json, status } = makeHost();
      filter.catch(new Error('DB password is hunter2'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const body = json.mock.calls[0][0];
      expect(body.stackTrace).toBeUndefined();
      expect(body.messages).toEqual([
        'An internal server error occurred. Please try again later.',
      ]);
      expect(JSON.stringify(body)).not.toContain('hunter2');
    });

    it('still exposes 4xx client messages', () => {
      const { host, json, status } = makeHost();
      filter.catch(new BadRequestException('email is invalid'), host);
      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(json.mock.calls[0][0].messages).toContain('email is invalid');
    });

    it('sanitizes BusinessException messages even for 5xx', () => {
      const { host, json } = makeHost();
      filter.catch(
        new BusinessException(
          'Provider failed for user auth0|secret: invalid_client',
          'IDENTITY_PROVIDER_ERROR',
          502,
        ),
        host,
      );
      const body = json.mock.calls[0][0];
      expect(body.messages).toEqual(['Identity provider operation failed.']);
      expect(JSON.stringify(body)).not.toContain('auth0|secret');
      expect(JSON.stringify(body)).not.toContain('invalid_client');
    });

    it('uses the standard envelope for throttling errors', () => {
      const { host, json, status } = makeHost();
      filter.catch(new ThrottlerException(), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(json.mock.calls[0][0]).toMatchObject({
        info: 'Error',
        messages: ['Too many requests. Please try again later.'],
        errorCode: 'RATE_LIMITED',
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });
  });

  describe('non-prod (environment="staging") is still treated as production-grade', () => {
    const filter = new GlobalExceptionFilter(undefined, 'staging');

    it('does not leak stack traces or raw 5xx messages in staging', () => {
      const { host, json } = makeHost();
      filter.catch(new Error('internal detail leak'), host);
      const body = json.mock.calls[0][0];
      expect(body.stackTrace).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('internal detail leak');
    });
  });

  describe('development environment', () => {
    const filter = new GlobalExceptionFilter(undefined, 'development');

    it('includes stack trace for debugging', () => {
      const { host, json } = makeHost();
      filter.catch(new Error('boom'), host);
      expect(json.mock.calls[0][0].stackTrace).toBeDefined();
    });

    it('never exposes BusinessException diagnostic data', () => {
      const { host, json } = makeHost();
      filter.catch(
        new BusinessException(
          'User 6f9619ff-8b86-4e3b not found for email private@example.org',
          'USER_NOT_FOUND',
          404,
        ),
        host,
      );

      const body = json.mock.calls[0][0];
      expect(body.messages).toEqual(['User not found.']);
      expect(JSON.stringify(body)).not.toContain('6f9619ff');
      expect(JSON.stringify(body)).not.toContain('private@example.org');
    });
  });

  describe('technical-error event emission', () => {
    it('emits AppTechnicalError for 5xx when an emitter is provided', () => {
      const publish = jest.fn();
      const filter = new GlobalExceptionFilter({ publish } as any, 'prod');
      const { host } = makeHost();
      filter.catch(new InternalServerErrorException('x'), host);
      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('does not emit for 4xx', () => {
      const publish = jest.fn();
      const filter = new GlobalExceptionFilter({ publish } as any, 'prod');
      const { host } = makeHost();
      filter.catch(new BadRequestException('x'), host);
      expect(publish).not.toHaveBeenCalled();
    });

    it('works without an emitter (alerting disabled)', () => {
      const filter = new GlobalExceptionFilter(undefined, 'prod');
      const { host, status } = makeHost();
      expect(() =>
        filter.catch(new InternalServerErrorException('x'), host),
      ).not.toThrow();
      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
