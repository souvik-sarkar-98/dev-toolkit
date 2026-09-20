export class MissingRequiredPortError extends Error {
  constructor(
    readonly moduleName: string,
    readonly portToken: symbol | string,
    readonly fixHint: string,
  ) {
    super(
      `[${moduleName}] Required port "${String(portToken)}" is not configured.\n` +
        `Fix: ${fixHint}`,
    );
    this.name = 'MissingRequiredPortError';
  }
}
