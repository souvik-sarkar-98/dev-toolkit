import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { ErrorResponse, getTraceId, TechnicalErrorPayload } from "@ssdev-toolkit/nestjs-core";
import { IAlertPort } from "../../../../domain/ports/alert.port";
import { AlertMessage } from "../../../../domain/value-objects/alert-message.vo";
import { AppTechnicalError } from "../../../events/app-technical-error.event";

function isErrorResponsePayload(
  payload: TechnicalErrorPayload | Error,
): payload is ErrorResponse {
  return payload instanceof ErrorResponse;
}

function isTechnicalErrorPayload(
  payload: TechnicalErrorPayload | Error,
): payload is TechnicalErrorPayload {
  return !(payload instanceof Error) && "messages" in payload;
}

@Injectable()
@EventsHandler(AppTechnicalError)
export class AppTechnicalErrorHandler implements IEventHandler<AppTechnicalError> {
  private readonly logger = new Logger(AppTechnicalErrorHandler.name);

  constructor(
    @Inject(IAlertPort)
    private readonly alertPort: IAlertPort,
  ) { }

  async handle(event: AppTechnicalError): Promise<void> {
    try {
      const { payload } = event;
      const traceId = isErrorResponsePayload(payload)
        ? payload.traceId
        : isTechnicalErrorPayload(payload)
          ? payload.traceId
          : getTraceId();
      const errorName = isErrorResponsePayload(payload)
        ? "ErrorResponse"
        : payload instanceof Error
          ? payload.constructor.name
          : "Error";
      const text = isErrorResponsePayload(payload)
        ? `HTTP ${payload.status} Error: ${(payload.messages || []).join(", ")}`
        : isTechnicalErrorPayload(payload)
          ? `HTTP ${payload.status ?? 500} Error: ${payload.messages.join(", ")}`
          : `${errorName}: ${payload.message || "Unknown Error"}`;
      const stackTrace = isErrorResponsePayload(payload)
        ? payload.stackTrace
        : isTechnicalErrorPayload(payload)
          ? payload.stackTrace
          : payload instanceof Error
            ? payload.stack
            : undefined;

      const message = new AlertMessage({
        text,
        type: "error",
        traceId: traceId || "not-available",
        stackTrace,
      });

      const result = await this.alertPort.send(message);
      if (!result.success && !result.skipped) {
        this.logger.warn(
          `Technical alert delivery failed (ref=${message.traceId}): ${result.error}`,
        );
      }
    } catch (err) {
      this.logger.error("Failed to send alert", err);
    }
  }
}
