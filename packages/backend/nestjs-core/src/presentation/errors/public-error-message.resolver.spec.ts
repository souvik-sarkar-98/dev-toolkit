import { BusinessError } from '../../domain/errors/business-error';
import { resolvePublicErrorMessage } from './public-error-message.resolver';

describe('resolvePublicErrorMessage', () => {
  it.each([
    [
      new BusinessError(
        'User 6f9619ff-8b86-4e3b not found for private@example.org',
        'USER_NOT_FOUND',
        404,
      ),
      'User not found.',
    ],
    [
      new BusinessError(
        'OAuth callback failed: invalid_client for tenant-123',
        'OAUTH_CALLBACK_ERROR',
        400,
      ),
      'OAuth callback failed. Restart the authorization flow.',
    ],
    [
      new BusinessError(
        'No read access on donation/entity-123',
        'ENTITY_ACCESS_DENIED',
        403,
      ),
      'You do not have permission to access the requested resource.',
    ],
  ])('maps registered errors without exposing diagnostic data', (error, expected) => {
    const message = resolvePublicErrorMessage(error);

    expect(message).toBe(expected);
    expect(message).not.toContain('6f9619ff');
    expect(message).not.toContain('private@example.org');
    expect(message).not.toContain('invalid_client');
    expect(message).not.toContain('tenant-123');
    expect(message).not.toContain('entity-123');
  });

  it('prefers an explicitly reviewed public message', () => {
    const error = new BusinessError(
      'Field internal_key failed with value secret',
      'CUSTOM_VALIDATION',
      400,
      'The submitted field is invalid.',
    );

    expect(resolvePublicErrorMessage(error)).toBe('The submitted field is invalid.');
  });

  it('uses category fallbacks for unknown error codes', () => {
    expect(
      resolvePublicErrorMessage(
        new BusinessError('Widget abc-123 missing', 'WIDGET_NOT_FOUND', 404),
      ),
    ).toBe('The requested resource was not found.');
    expect(
      resolvePublicErrorMessage(
        new BusinessError('No delete access to abc-123', 'WIDGET_ACCESS_DENIED', 403),
      ),
    ).toBe('You do not have permission to perform this action.');
  });

  it('uses a status fallback and never returns the internal message', () => {
    const internal = 'Account acct-123 failed: password=hunter2';
    const message = resolvePublicErrorMessage(
      new BusinessError(internal, 'UNREGISTERED_ACCOUNT_FAILURE', 502),
    );

    expect(message).toBe('A service error occurred. Please try again later.');
    expect(message).not.toBe(internal);
  });
});
