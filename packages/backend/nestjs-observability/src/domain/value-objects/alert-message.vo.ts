import { BusinessError } from '@ssdev-toolkit/nestjs-core';
import { AlertType } from '../enums/alert-type.enum';

export interface AlertMessageProps {
  text: string;
  type: AlertType;
  traceId?: string;
  stackTrace?: string;
}

/** Immutable value object representing a single alert message. Equality is by value. */
export class AlertMessage {
  readonly text: string;
  readonly type: AlertType;
  readonly traceId?: string;
  readonly stackTrace?: string;

  constructor(props: AlertMessageProps) {
    if (!props.text || props.text.trim().length === 0) {
      throw new BusinessError('AlertMessage text cannot be empty', 'INVALID_ALERT_MESSAGE');
    }
    this.text = props.text;
    this.type = props.type;
    this.traceId = props.traceId;
    this.stackTrace = props.stackTrace;
  }

  equals(other: AlertMessage): boolean {
    return (
      this.text === other.text &&
      this.type === other.type &&
      this.traceId === other.traceId &&
      this.stackTrace === other.stackTrace
    );
  }
}
