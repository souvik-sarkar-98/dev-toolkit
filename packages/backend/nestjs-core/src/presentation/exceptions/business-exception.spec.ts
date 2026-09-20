import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '@ssdev-toolkit/nestjs-core';

describe('BusinessException', () => {
  it('is an instance of Error', () => {
    const err = new BusinessException('Something went wrong');
    expect(err).toBeInstanceOf(Error);
  });

  it('has HTTP status 400 (BAD_REQUEST)', () => {
    const err = new BusinessException('bad input');
    expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('does not include the diagnostic message in the response body', () => {
    const err = new BusinessException('Invalid amount for account acct-123');
    const response = err.getResponse() as any;
    expect(response.message).toBe('The request could not be completed.');
    expect(response.message).not.toContain('acct-123');
  });

  it('uses an explicit reviewed public message', () => {
    const err = new BusinessException(
      'User 4cfa7a9b not found',
      'USER_NOT_FOUND',
      404,
      'User not found.',
    );
    expect(err.getResponse().message).toBe('User not found.');
    expect(err.message).toContain('4cfa7a9b');
  });

  it('defaults errorCode to BUSINESS_ERROR when not provided', () => {
    const err = new BusinessException('test error');
    const response = err.getResponse() as any;
    expect(response.errorCode).toBe('BUSINESS_ERROR');
  });

  it('uses the provided errorCode', () => {
    const err = new BusinessException('test error', 'CUSTOM_CODE');
    const response = err.getResponse() as any;
    expect(response.errorCode).toBe('CUSTOM_CODE');
  });

  it('includes statusCode 400 in the response body', () => {
    const err = new BusinessException('test');
    const response = err.getResponse() as any;
    expect(response.statusCode).toBe(400);
  });
});
