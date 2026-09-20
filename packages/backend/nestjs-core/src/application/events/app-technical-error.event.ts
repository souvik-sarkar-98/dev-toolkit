import { RootEvent } from '../../domain/events/root-event';

/**
 * Plain-data payload that describes a server-side technical failure.
 * Mirrors the fields of `ErrorResponse` but lives in the application layer so
 * this event has zero dependency on the presentation layer.
 */
export interface TechnicalErrorPayload {
  messages: string[];
  status?: number;
  stackTrace?: string;
  errorCode?: string;
  traceId?: string;
}

export class AppTechnicalError extends RootEvent {
  constructor(public readonly payload: TechnicalErrorPayload | Error) {
    super();
  }
}
