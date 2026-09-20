import { SetMetadata } from '@nestjs/common';

export const EXPECTED_RECAPTCHA_ACTION_KEY = 'expectedRecaptchaAction';

/**
 * When set on a `@Public()` route, the captcha action header must match this value.
 */
export const ExpectedRecaptchaAction = (action: string) =>
  SetMetadata(EXPECTED_RECAPTCHA_ACTION_KEY, action);
