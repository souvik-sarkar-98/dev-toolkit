import { ApiProperty } from '@nestjs/swagger';
import { ENVELOPE_EXAMPLES } from './swagger-examples';

export class SuccessResponse<T> {
  @ApiProperty({ example: ENVELOPE_EXAMPLES.info }) info: string;
  @ApiProperty({ example: ENVELOPE_EXAMPLES.timestamp }) timestamp: Date;
  @ApiProperty({ example: ENVELOPE_EXAMPLES.traceId }) traceId?: string;
  @ApiProperty({ example: ENVELOPE_EXAMPLES.message }) message: string;
  @ApiProperty({ description: 'Response payload data' }) responsePayload?: T;

  constructor(payload?: T) {
    this.info = 'Success';
    this.timestamp = new Date();
    this.traceId = '';
    if (payload != null) {
      this.responsePayload = payload;
    }
  }

  addMessage(message: string) {
    this.message = message;
    return this;
  }
}

export class ErrorResponse {
  @ApiProperty({ example: 'Error' }) info: string;
  @ApiProperty({ example: ENVELOPE_EXAMPLES.timestamp }) timestamp: Date;
  @ApiProperty({ example: ENVELOPE_EXAMPLES.traceId }) traceId?: string;
  @ApiProperty({ example: ['Requested resource was not found'] }) messages: string[];
  @ApiProperty({ required: false, example: 'BusinessException: Requested resource was not found' })
  stackTrace?: string;
  @ApiProperty({ required: false, example: 'RESOURCE_NOT_FOUND' }) errorCode?: string;
  @ApiProperty({ required: false, example: 404 }) status?: number;

  constructor(err?: Error) {
    this.info = 'Error';
    this.timestamp = new Date();
    this.traceId = '';
    this.messages = [];
    if (err) {
      this.messages = [err.message];
      this.stackTrace = err.stack;
      if (err.name) this.messages.push(`Name: ${err.name}`);
      const cause = (err as Error & { cause?: unknown }).cause;
      if (cause) this.messages.push(`Caused by: ${String(cause)}`);
    }
  }

  addMessage(message: string) {
    this.messages.unshift(message);
    return this;
  }

  setErrorCode(code: string) {
    this.errorCode = code;
    return this;
  }
}
