import { AlertMessage } from '../value-objects/alert-message.vo';

export interface AlertResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

export const IAlertPort = Symbol('IAlertPort');

/** Port contract for sending alerts to an external notification channel. */
export interface IAlertPort {
  send(message: AlertMessage): Promise<AlertResult>;
}
