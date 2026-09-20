export abstract class RootEvent {
  #logs: string[] = [];

  log(log: string) {
    this.#logs.push(`[LOG][${new Date().toISOString()}] ${log}`);
  }

  error(log: string, error: Error) {
    this.#logs.push(`[ERROR][${new Date().toISOString()}] ${log} ${error.stack}`);
  }

  warn(log: string) {
    this.#logs.push(`[WARN][${new Date().toISOString()}] ${log}`);
  }

  get logs(): string[] {
    return this.#logs;
  }
}
