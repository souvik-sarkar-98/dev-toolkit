import { SetMetadata } from '@nestjs/common';

export const IGNORE_CAPTCHA = 'ignoreCaptcha';
export const IgnoreCaptcha = () => SetMetadata(IGNORE_CAPTCHA, true);
