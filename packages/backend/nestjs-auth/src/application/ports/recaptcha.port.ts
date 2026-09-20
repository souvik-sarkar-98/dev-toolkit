export const IRecaptchaPort = Symbol('IRecaptchaPort');

export interface IRecaptchaPort {
  verify(token: string, action: string, threshold: number): Promise<boolean>;
}
