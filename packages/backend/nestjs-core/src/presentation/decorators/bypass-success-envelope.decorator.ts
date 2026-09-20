import { SetMetadata } from '@nestjs/common';

export const BYPASS_SUCCESS_ENVELOPE_KEY = 'bypassSuccessEnvelope';

/**
 * When set on a controller handler, `SuccessResponseInterceptor` returns the
 * raw controller payload without wrapping it in `SuccessResponse<T>`.
 */
export const BypassSuccessEnvelope = () => SetMetadata(BYPASS_SUCCESS_ENVELOPE_KEY, true);
