/**
 * Base class for all domain / business rule violations.
 *
 * Extend this for every named domain error so the global exception filter
 * can distinguish a deliberate business rule violation from an unexpected
 * infrastructure failure.
 *
 * `message` is diagnostic and may contain identifiers or provider details.
 * It must never be sent directly to a client. `publicMessage`, when supplied,
 * is reviewed client-safe text; otherwise the presentation layer resolves a
 * safe message from the error code and status.
 *
 * @example
 * export class OrderAlreadyCancelledError extends BusinessError {
 *   constructor(orderId: string) {
 *     super(`Order ${orderId} has already been cancelled.`, 'ORDER_ALREADY_CANCELLED');
 *   }
 * }
 */
export class BusinessError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly publicMessage?: string;

  constructor(
    message: string,
    errorCode: string = 'BUSINESS_ERROR',
    statusCode: number = 400,
    publicMessage?: string,
  ) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.publicMessage = publicMessage;
    // Maintain correct prototype chain for `instanceof` checks across
    // transpilation targets (tsc with ES5 downlevelling).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
